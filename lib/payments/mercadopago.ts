import { createHash, createHmac, timingSafeEqual } from "crypto";
import { claimPaymentAttempt, PaymentConflict, terminalAttemptStatuses } from "@/lib/payments/attempts";
import { recordPurchaseEvent } from "@/lib/purchase-analytics";
import { financialTransaction } from "@/lib/financial-transaction";
import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";
import { markOrderPaidAndNotify } from "@/lib/order-events";
import { prisma } from "@/lib/prisma";

type MercadoPagoPaymentResponse = {
  id: number | string;
  status?: string;
  status_detail?: string;
  external_reference?: string;
  currency_id?: string;
  transaction_amount?: number;
  date_created?: string;
  metadata?: { afilink_attempt_id?: string };
  payer?: {
    email?: string;
  };
};

type MercadoPagoPreferenceResponse = {
  id: string;
};

type ShippingData = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingStreet?: string | null;
  shippingNumber?: string | null;
  shippingApartment: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string;
  shippingNotes: string | null;
};

type MercadoPagoBrickFormData = {
  token?: string;
  issuer_id?: string | number;
  payment_method_id?: string;
  transaction_amount?: number;
  installments?: number;
  payer?: {
    email?: string;
    identification?: {
      type?: string;
      number?: string;
    };
  };
};

const MERCADOPAGO_API_URL = "https://api.mercadopago.com";

function resolveBaseUrl() {
  const baseUrl =
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL;

  if (!baseUrl) {
    throw new Error(
      "Falta APP_URL, NEXT_PUBLIC_APP_URL o NEXTAUTH_URL para construir las URLs"
    );
  }

  return baseUrl.replace(/\/$/, "");
}

function isLocalUrl(url: string) {
  return (
    url.includes("localhost") ||
    url.includes("127.0.0.1") ||
    url.includes("0.0.0.0")
  );
}

function getMercadoPagoConfig() {
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Falta MERCADOPAGO_ACCESS_TOKEN");
  }

  return {
    accessToken,
    apiUrl: process.env.MERCADOPAGO_API_URL?.replace(/\/$/, "") || MERCADOPAGO_API_URL,
  };
}

function getMercadoPagoPublicKey() {
  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY;

  if (!publicKey) {
    throw new Error("Falta NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY");
  }

  return publicKey;
}

function getMercadoPagoHeaders(idempotencyKey?: string) {
  const { accessToken } = getMercadoPagoConfig();

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(idempotencyKey ? { "X-Idempotency-Key": idempotencyKey } : {}),
  };
}

function cleanUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanUndefined(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => [key, cleanUndefined(nested)] as const)
      .filter(([, nested]) => nested !== undefined && nested !== "");

    return Object.fromEntries(entries) as T;
  }

  return value;
}

async function parseMercadoPagoError(response: Response) {
  const text = await response.text();

  try {
    const payload = JSON.parse(text) as {
      message?: string;
      error?: string;
      cause?: Array<{ description?: string; code?: string }>;
    };
    const cause = payload.cause
      ?.map((item) => item.description || item.code)
      .filter(Boolean)
      .join(" - ");

    return [payload.message, payload.error, cause].filter(Boolean).join(" - ");
  } catch {
    return text;
  }
}

function getDescription(order: {
  items: Array<{ product: { name: string } }>;
  product: { name: string };
}) {
  if (order.items.length === 1) return order.items[0].product.name.slice(0, 100);
  if (order.items.length > 1) {
    return `Carrito Afilink (${order.items.length} productos)`;
  }

  return order.product.name.slice(0, 100);
}

function isApprovedMercadoPagoStatus(status?: string | null) {
  return status === "approved";
}

function isCanceledMercadoPagoStatus(status?: string | null) {
  return (
    status === "refunded" ||
    status === "charged_back"
  );
}

export function getMercadoPagoPublicConfig() {
  return {
    publicKey: getMercadoPagoPublicKey(),
    sdkUrl: "https://sdk.mercadopago.com/js/v2",
  };
}

export async function createMercadoPagoPreference(
  orderId: string,
  shippingData?: ShippingData
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
              desc: true,
            },
          },
        },
      },
      product: {
        select: {
          name: true,
          desc: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada");
  }

  if (order.status === OrderStatus.PAID) {
    throw new Error("La orden ya fue pagada");
  }

  if (order.preferenceId) return { id: order.preferenceId };

  const { apiUrl } = getMercadoPagoConfig();
  const baseUrl = resolveBaseUrl();
  const useNotificationUrl = !isLocalUrl(baseUrl);
  const items = order.items.length
    ? order.items
    : [
        {
          quantity: 1,
          total: order.total,
          product: order.product,
        },
      ];
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const taxAmount = Math.max(0, Number(order.total) - subtotal);
  const preferenceItems = [
    ...items.map((item) => ({
      id: item.product.name.slice(0, 64),
      title: item.product.name.slice(0, 256),
      description: item.product.desc?.slice(0, 600),
      quantity: item.quantity,
      currency_id: process.env.MERCADOPAGO_CURRENCY || "UYU",
      unit_price: Number((item.total / item.quantity).toFixed(2)),
    })),
    ...(taxAmount > 0
      ? [
          {
            id: "afilink-recargo",
            title: "Recargo",
            quantity: 1,
            currency_id: process.env.MERCADOPAGO_CURRENCY || "UYU",
            unit_price: Number(taxAmount.toFixed(2)),
          },
        ]
      : []),
  ];

  const payload = cleanUndefined({
    external_reference: order.id,
    statement_descriptor: "AFILINK",
    items: preferenceItems,
    payer: {
      name: shippingData?.buyerName || order.buyerName || undefined,
      email: shippingData?.buyerEmail || order.buyerEmail || undefined,
      phone: {
        number: shippingData?.buyerPhone || order.buyerPhone || undefined,
      },
    },
    back_urls: {
      success: `${baseUrl}/orders/${order.id}/success`,
      failure: `${baseUrl}/checkout/${order.id}`,
      pending: `${baseUrl}/checkout/${order.id}`,
    },
    ...(useNotificationUrl
      ? { notification_url: `${baseUrl}/api/payments/mercadopago/webhook` }
      : {}),
  });

  const response = await fetch(`${apiUrl}/checkout/preferences`, {
    method: "POST",
    headers: getMercadoPagoHeaders(),
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(
      `Mercado Pago rechazo la preferencia: ${await parseMercadoPagoError(response)}`
    );
  }

  const preference = (await response.json()) as MercadoPagoPreferenceResponse;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProvider: "mercadopago",
      preferenceId: preference.id,
      ...(order.paymentStatus === "not_started" ? { paymentStatus: "ready" } : {}),
    },
  });

  return preference;
}

export async function createMercadoPagoPayment({
  orderId,
  formData,
  attemptId,
}: {
  orderId: string;
  formData: MercadoPagoBrickFormData;
  attemptId: string;
}) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      product: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada");
  }

  const { apiUrl } = getMercadoPagoConfig();
  const baseUrl = resolveBaseUrl();
  const useNotificationUrl = !isLocalUrl(baseUrl);
  const paymentPayload = cleanUndefined({
    transaction_amount: Number(order.total),
    token: formData.token,
    description: getDescription(order),
    installments: Number(formData.installments || 1),
    payment_method_id: formData.payment_method_id,
    issuer_id: formData.issuer_id ? String(formData.issuer_id) : undefined,
    external_reference: order.id,
    statement_descriptor: "AFILINK",
    payer: {
      email: formData.payer?.email || order.buyerEmail || undefined,
      identification: {
        type: formData.payer?.identification?.type,
        number: formData.payer?.identification?.number,
      },
    },
    metadata: {
      afilink_order_id: order.id,
      afilink_attempt_id: attemptId,
    },
    ...(useNotificationUrl
      ? { notification_url: `${baseUrl}/api/payments/mercadopago/webhook` }
      : {}),
  });

  const requestHash = createHash("sha256").update(JSON.stringify(paymentPayload)).digest("hex");
  const claim = await claimPaymentAttempt(orderId, attemptId, requestHash, formData.payment_method_id ?? "card");
  if (!claim.send) {
    if (claim.attempt.paymentId) {
      const existingPayment = await fetchMercadoPagoPayment(claim.attempt.paymentId);
      await syncOrderWithMercadoPagoPayment(existingPayment);
      return existingPayment;
    }
    return { id: "", status: "processing", external_reference: orderId };
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v1/payments`, {
    method: "POST",
    headers: getMercadoPagoHeaders(attemptId),
    body: JSON.stringify(paymentPayload),
    signal: AbortSignal.timeout(20_000),
    });
  } catch {
    await prisma.paymentAttempt.updateMany({ where: { id: attemptId, paymentId: null }, data: { status: "unknown" } });
    throw new PaymentConflict("No recibimos la respuesta del pago. Estamos verificándolo; no inicies otro intento");
  }

  if (!response.ok) {
    const definitiveFailure = [400, 422].includes(response.status);
    await prisma.paymentAttempt.updateMany({ where: { id: attemptId, paymentId: null }, data: { status: definitiveFailure ? "failed" : "unknown" } });
    await prisma.order.updateMany({ where: { id: orderId, status: "PENDING", paymentStatus: "processing" }, data: { paymentStatus: definitiveFailure ? "failed" : "unknown" } });
    throw new Error(
      `Mercado Pago rechazo el pago: ${await parseMercadoPagoError(response)}`
    );
  }

  const payment = (await response.json()) as MercadoPagoPaymentResponse;
  await prisma.paymentAttempt.updateMany({ where: { id: attemptId, paymentId: null }, data: { paymentId: String(payment.id), status: "unknown" } });
  // Query the provider again before updating the sale or granting commissions.
  const verifiedPayment = await fetchMercadoPagoPayment(String(payment.id));
  if (verifiedPayment.external_reference !== orderId) throw new Error("El pago no corresponde a la orden");
  await syncOrderWithMercadoPagoPayment(verifiedPayment, attemptId);

  return verifiedPayment;
}

export async function fetchMercadoPagoPayment(paymentId: string) {
  const { apiUrl } = getMercadoPagoConfig();
  const response = await fetch(`${apiUrl}/v1/payments/${paymentId}`, {
    headers: getMercadoPagoHeaders(),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(
      `No se pudo consultar el pago en Mercado Pago: ${await parseMercadoPagoError(response)}`
    );
  }

  return (await response.json()) as MercadoPagoPaymentResponse;
}

export async function syncOrderWithMercadoPagoPayment(
  payment: MercadoPagoPaymentResponse,
  requestedAttemptId?: string
) {
  const orderId = payment.external_reference;

  if (!orderId) {
    return null;
  }

  const expected = await prisma.order.findUnique({ where: { id: orderId }, select: { total: true, sessionId: true, productId: true } });
  if (!expected) throw new Error("Orden no encontrada");
  if (typeof payment.transaction_amount !== "number" || !Number.isFinite(payment.transaction_amount) ||
      Math.round(payment.transaction_amount * 100) !== Math.round(expected.total * 100) ||
      payment.currency_id !== (process.env.MERCADOPAGO_CURRENCY || "UYU")) {
    throw new Error("El importe o la moneda del pago no coincide con la orden");
  }

  const attemptId = requestedAttemptId || payment.metadata?.afilink_attempt_id;
  let attempt = attemptId
    ? await prisma.paymentAttempt.findUnique({ where: { id: attemptId } })
    : await prisma.paymentAttempt.findFirst({ where: { orderId, paymentId: String(payment.id) } });
  if (!attempt && !attemptId) {
    const wallet = await prisma.paymentAttempt.findFirst({ where: { orderId, method: "wallet", status: { in: ["processing", "unknown", "pending_wallet"] } }, orderBy: { createdAt: "desc" } });
    // Native Wallet payments have no attempt metadata. A previous payment must
    // never be attached to the current redirect, including legacy payments.
    if (wallet?.startedAt && payment.date_created &&
        new Date(payment.date_created).getTime() >= wallet.startedAt.getTime()) attempt = wallet;
  }
  if (attempt && attempt.orderId !== orderId) throw new Error("El intento no corresponde a la orden");
  if (attempt) await prisma.paymentAttempt.updateMany({ where: { id: attempt.id, status: { notIn: ["refunded", "charged_back", ...(!["approved", "refunded", "charged_back"].includes(payment.status ?? "") ? ["approved"] : [])] } }, data: {
    paymentId: String(payment.id), status: payment.status ?? "pending", statusDetail: payment.status_detail?.slice(0, 100) ?? null,
  } });

  if (isApprovedMercadoPagoStatus(payment.status)) {
    await markOrderPaidAndNotify({ orderId, buyerEmail: payment.payer?.email ?? null,
      paymentId: String(payment.id), paymentProvider: "mercadopago", paymentStatus: payment.status });
  } else {
    await financialTransaction(async tx => {
      const order = await tx.order.findUnique({ where: { id: orderId } });
      if (!order) throw new Error("Orden no encontrada");
      const latest = await tx.paymentAttempt.findFirst({ where: { orderId }, orderBy: { createdAt: "desc" } });
      if (attempt && latest && attempt.id !== latest.id && !["refunded", "charged_back"].includes(payment.status ?? "")) return;
      const reversal = payment.status === "refunded" || payment.status === "charged_back";
      if (!attempt && latest && ["processing", "unknown", "pending_wallet"].includes(latest.status) && !reversal) return;
      // A failed/late attempt must never undo a different successful payment.
      if (order.status === OrderStatus.PAID && (!reversal || order.paymentId !== String(payment.id))) return;
      if (["refunded", "charged_back", "canceled"].includes(order.paymentStatus?.toLowerCase() ?? "")) return;
      // A late failed attempt cannot hide a newer pending payment.
      if (order.paymentId && order.paymentId !== String(payment.id) && ["pending", "in_process", "authorized"].includes(order.paymentStatus ?? "")) return;
      const canceled = isCanceledMercadoPagoStatus(payment.status);
      await tx.order.update({ where: { id: orderId }, data: {
        ...(canceled ? { status: OrderStatus.CANCELED } : {}),
        paymentId: String(payment.id), paymentProvider: "mercadopago", paymentStatus: payment.status ?? "pending",
      } });
      if (["pending", "in_process", "rejected", "cancelled"].includes(payment.status ?? "")) {
        await recordPurchaseEvent({ name: payment.status === "rejected" || payment.status === "cancelled" ? "payment_rejected" : "payment_pending", eventKey: `payment:${payment.id}:${payment.status}`, orderId, productId: order.productId, sessionId: order.sessionId }, tx);
      }
      if (canceled) {
        // Keep already transferred earnings in the audit history after a refund.
        await tx.commission.updateMany({ where: { orderId, status: { not: CommissionStatus.PAID } }, data: { status: CommissionStatus.CANCELED } });
        await tx.settlement.updateMany({ where: { orderId, status: { not: SettlementStatus.PAID } }, data: { status: SettlementStatus.CANCELED } });
      }
    });
  }

  return orderId;
}

export async function reconcileMercadoPagoOrder(orderId: string) {
  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order) throw new Error("Orden no encontrada");
  const active = await prisma.paymentAttempt.findFirst({ where: { orderId, status: { notIn: terminalAttemptStatuses } }, orderBy: { createdAt: "desc" } });
  const knownIds = new Set([order.paymentId, active?.paymentId].filter((id): id is string => Boolean(id)));
  for (const id of knownIds) await syncOrderWithMercadoPagoPayment(await fetchMercadoPagoPayment(id));
  if (!active || active.paymentId || active.status === "ready") return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
  const { apiUrl } = getMercadoPagoConfig();
  // Search is required after an unknown result or a Wallet redirect, where the
  // browser may never receive a payment ID. Never treat an empty search as rejection.
  const response = await fetch(`${apiUrl}/v1/payments/search?external_reference=${encodeURIComponent(orderId)}&sort=date_created&criteria=desc`, {
    headers: getMercadoPagoHeaders(), cache: "no-store", signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("No se pudo verificar el estado del pago");
  const result = await response.json() as { results?: MercadoPagoPaymentResponse[] };
  for (const payment of (result.results ?? []).filter(p => p.external_reference === orderId &&
    (p.metadata?.afilink_attempt_id === active.id || (active.method === "wallet" && active.startedAt && p.date_created &&
      new Date(p.date_created).getTime() >= active.startedAt.getTime()))).reverse()) {
    const verified = await fetchMercadoPagoPayment(String(payment.id));
    await syncOrderWithMercadoPagoPayment(verified);
  }
  return prisma.order.findUniqueOrThrow({ where: { id: orderId } });
}

export function verifyMercadoPagoWebhookSignature({
  xSignature,
  xRequestId,
  dataId,
}: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}) {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;

  if (!secret) return true;
  if (!xSignature || !xRequestId || !dataId) return false;

  const parts = Object.fromEntries(
    xSignature.split(",").map((part) => {
      const [key, value] = part.split("=");
      return [key?.trim(), value?.trim()];
    })
  );
  const ts = parts.ts;
  const receivedSignature = parts.v1;

  if (!ts || !receivedSignature) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expectedSignature = createHmac("sha256", secret)
    .update(manifest)
    .digest("hex");
  const received = Buffer.from(receivedSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}
