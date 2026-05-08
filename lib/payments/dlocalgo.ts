import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";
import { markOrderPaidAndNotify } from "@/lib/order-events";
import { getCheckoutDraft } from "@/lib/payments/createOrder";
import { prisma } from "@/lib/prisma";

type DlocalGoPaymentResponse = {
  id: string;
  status?: "PENDING" | "PAID" | "REJECTED" | "CANCELLED" | "EXPIRED" | string;
  order_id?: string;
  redirect_url?: string;
  merchant_checkout_token?: string;
  payer?: {
    email?: string;
  };
};

type DlocalGoConfirmResponse = {
  success?: boolean;
  payment_id?: string;
  external_id?: string;
  redirect_url?: string;
  amount?: number;
  currency?: string;
  status?: string;
  message?: string;
  details?: {
    message?: string;
  };
};

type ShippingData = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingApartment: string | null;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string | null;
  shippingCountry: string;
  shippingNotes: string | null;
};

type CheckoutItemInput = {
  productId: string;
  quantity?: number;
  selectedSize?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

const DLOCALGO_SANDBOX_API_URL = "https://api-sbx.dlocalgo.com";
const DLOCALGO_LIVE_API_URL = "https://api.dlocalgo.com";

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

function getDlocalGoConfig() {
  const apiKey = process.env.DLOCALGO_API_KEY;
  const secretKey = process.env.DLOCALGO_SECRET_KEY;

  if (!apiKey || !secretKey) {
    throw new Error("Faltan DLOCALGO_API_KEY o DLOCALGO_SECRET_KEY");
  }

  const mode = process.env.DLOCALGO_MODE?.toLowerCase();
  const apiUrl =
    process.env.DLOCALGO_API_URL ||
    (mode === "live" ? DLOCALGO_LIVE_API_URL : DLOCALGO_SANDBOX_API_URL);

  return {
    apiKey,
    secretKey,
    apiUrl: apiUrl.replace(/\/$/, ""),
  };
}

function getDlocalGoHeaders() {
  const { apiKey, secretKey } = getDlocalGoConfig();

  return {
    Authorization: `Bearer ${apiKey}:${secretKey}`,
    "Content-Type": "application/json",
    "X-Idempotency-Key": randomUUID(),
  };
}

export function getDlocalGoSmartFieldsConfig() {
  const smartFieldsApiKey = process.env.DLOCALGO_SMARTFIELDS_API_KEY;

  if (!smartFieldsApiKey) {
    throw new Error("Falta DLOCALGO_SMARTFIELDS_API_KEY");
  }

  const mode = process.env.DLOCALGO_MODE?.toLowerCase();
  const sdkUrl =
    mode === "live"
      ? "https://checkout.dlocalgo.com/js/dlocalgo-smartfields-bundled.js"
      : "https://checkout-sbx.dlocalgo.com/js/dlocalgo-smartfields-bundled.js";

  return {
    smartFieldsApiKey,
    sdkUrl,
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

function normalizeDlocalGoError(errorText: string) {
  try {
    const payload = JSON.parse(errorText) as {
      message?: string;
      error?: string;
      code?: string;
    };

    return [payload.message, payload.error, payload.code]
      .filter(Boolean)
      .join(" - ");
  } catch {
    return errorText;
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

function getDraftDescription(items: Array<{ product: { name: string } }>) {
  if (items.length === 1) return items[0].product.name.slice(0, 100);
  return `Carrito Afilink (${items.length} productos)`;
}

export async function createDlocalGoPayment(
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

  if (order.status === OrderStatus.PAID) {
    throw new Error("La orden ya fue pagada");
  }

  const { apiUrl } = getDlocalGoConfig();
  const baseUrl = resolveBaseUrl();
  const useNotificationUrl = !isLocalUrl(baseUrl);
  const country = (shippingData?.shippingCountry || order.shippingCountry || "UY")
    .slice(0, 2)
    .toUpperCase();
  const payerName = shippingData?.buyerName || order.buyerName || undefined;
  const [firstName, ...lastNameParts] = payerName?.split(/\s+/) ?? [];

  const paymentPayload = cleanUndefined({
    amount: Number(order.total),
    currency: process.env.DLOCALGO_CURRENCY || "UYU",
    country,
    order_id: order.id,
    description: getDescription(order),
    success_url: `${baseUrl}/orders/${order.id}/success`,
    back_url: `${baseUrl}/checkout/${order.id}`,
    ...(useNotificationUrl
      ? { notification_url: `${baseUrl}/api/payments/dlocalgo/webhook` }
      : {}),
    allow_transparent: true,
    payer: {
      id: order.id,
      name: payerName,
      first_name: firstName,
      last_name: lastNameParts.join(" ") || undefined,
      email: shippingData?.buyerEmail || order.buyerEmail || undefined,
      phone: shippingData?.buyerPhone || order.buyerPhone || undefined,
      address: {
        state: shippingData?.shippingState || order.shippingState || undefined,
        city: shippingData?.shippingCity || order.shippingCity || undefined,
        zip_code:
          shippingData?.shippingPostalCode ||
          order.shippingPostalCode ||
          undefined,
        full_address: [
          shippingData?.shippingStreet || order.shippingStreet,
          shippingData?.shippingNumber || order.shippingNumber,
          shippingData?.shippingApartment || order.shippingApartment,
        ]
          .filter(Boolean)
          .join(" "),
      },
    },
  });

  const response = await fetch(`${apiUrl}/v1/payments`, {
    method: "POST",
    headers: getDlocalGoHeaders(),
    body: JSON.stringify(paymentPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`dLocal Go rechazo el pago: ${normalizeDlocalGoError(errorText)}`);
  }

  const payment = (await response.json()) as DlocalGoPaymentResponse;

  await prisma.order.update({
    where: { id: order.id },
    data: {
      paymentProvider: "dlocalgo",
      paymentId: payment.id,
      paymentStatus: payment.status ?? "PENDING",
    },
  });

  return payment;
}

export async function createDlocalGoDraftPayment({
  items,
  shippingData,
}: {
  items: CheckoutItemInput[];
  shippingData: ShippingData;
}) {
  const draft = await getCheckoutDraft(items);
  const { apiUrl } = getDlocalGoConfig();
  const baseUrl = resolveBaseUrl();
  const useNotificationUrl = !isLocalUrl(baseUrl);
  const country = (shippingData.shippingCountry || "UY").slice(0, 2).toUpperCase();
  const [firstName, ...lastNameParts] = shippingData.buyerName.split(/\s+/);

  const paymentPayload = cleanUndefined({
    amount: Number(draft.total),
    currency: process.env.DLOCALGO_CURRENCY || "UYU",
    country,
    description: getDraftDescription(draft.items),
    success_url: `${baseUrl}/checkout`,
    back_url: `${baseUrl}/checkout`,
    ...(useNotificationUrl
      ? { notification_url: `${baseUrl}/api/payments/dlocalgo/webhook` }
      : {}),
    allow_transparent: true,
    payer: {
      name: shippingData.buyerName,
      first_name: firstName,
      last_name: lastNameParts.join(" ") || undefined,
      email: shippingData.buyerEmail,
      phone: shippingData.buyerPhone,
      address: {
        state: shippingData.shippingState,
        city: shippingData.shippingCity,
        zip_code: shippingData.shippingPostalCode || undefined,
        full_address: [
          shippingData.shippingStreet,
          shippingData.shippingNumber,
          shippingData.shippingApartment,
        ]
          .filter(Boolean)
          .join(" "),
      },
    },
  });

  const response = await fetch(`${apiUrl}/v1/payments`, {
    method: "POST",
    headers: getDlocalGoHeaders(),
    body: JSON.stringify(paymentPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`dLocal Go rechazo el pago: ${normalizeDlocalGoError(errorText)}`);
  }

  return (await response.json()) as DlocalGoPaymentResponse;
}

export async function confirmDlocalGoPayment({
  orderId,
  checkoutToken,
  cardToken,
  clientFirstName,
  clientLastName,
  clientDocumentType,
  clientDocument,
  clientEmail,
  installmentsId,
}: {
  orderId: string;
  checkoutToken: string;
  cardToken: string;
  clientFirstName: string;
  clientLastName: string;
  clientDocumentType: string;
  clientDocument: string;
  clientEmail: string;
  installmentsId?: string;
}) {
  const { apiUrl } = getDlocalGoConfig();
  const requestBody = cleanUndefined({
    cardToken,
    clientFirstName,
    clientLastName,
    clientDocumentType,
    clientDocument,
    clientEmail,
    ...(installmentsId ? { installmentsId } : {}),
  });

  const response = await fetch(`${apiUrl}/v1/payments/confirm/${checkoutToken}`, {
    method: "POST",
    headers: getDlocalGoHeaders(),
    body: JSON.stringify(requestBody),
  });

  const responseText = await response.text();
  const data = responseText
    ? (JSON.parse(responseText) as DlocalGoConfirmResponse)
    : {};

  if (!response.ok) {
    throw new Error(
      `dLocal Go rechazo la confirmacion: ${
        data.message || data.details?.message || normalizeDlocalGoError(responseText)
      }`
    );
  }

  if (data.success === true && !data.redirect_url) {
    await markOrderPaidAndNotify({
      orderId,
      buyerEmail: clientEmail,
      paymentId: data.payment_id ?? data.external_id ?? checkoutToken,
      paymentProvider: "dlocalgo",
      paymentStatus: data.status ?? "PAID",
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentProvider: "dlocalgo",
        paymentId: data.payment_id ?? data.external_id ?? checkoutToken,
        paymentStatus: data.status ?? "PENDING",
      },
    });
  }

  return data;
}

export async function fetchDlocalGoPayment(paymentId: string) {
  const { apiUrl } = getDlocalGoConfig();
  const response = await fetch(`${apiUrl}/v1/payments/${paymentId}`, {
    headers: getDlocalGoHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo consultar el pago en dLocal Go: ${errorText}`);
  }

  return (await response.json()) as DlocalGoPaymentResponse;
}

export async function syncOrderWithDlocalGoPayment(payment: DlocalGoPaymentResponse) {
  const orderId = payment.order_id;

  if (!orderId) {
    return null;
  }

  if (payment.status === "PAID") {
    await markOrderPaidAndNotify({
      orderId,
      buyerEmail: payment.payer?.email ?? null,
      paymentId: String(payment.id),
      paymentProvider: "dlocalgo",
      paymentStatus: payment.status,
    });
  } else if (
    payment.status === "REJECTED" ||
    payment.status === "CANCELLED" ||
    payment.status === "EXPIRED"
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELED,
          paymentId: String(payment.id),
          paymentProvider: "dlocalgo",
          paymentStatus: payment.status,
        },
      });

      await tx.commission.updateMany({
        where: { orderId },
        data: { status: CommissionStatus.CANCELED },
      });

      await tx.settlement.updateMany({
        where: { orderId },
        data: { status: SettlementStatus.CANCELED },
      });
    });
  } else {
    await prisma.order.update({
      where: { id: orderId },
      data: {
        paymentId: String(payment.id),
        paymentProvider: "dlocalgo",
        paymentStatus: payment.status,
      },
    });
  }

  return orderId;
}

export function verifyDlocalGoNotificationSignature({
  rawBody,
  authorization,
}: {
  rawBody: string;
  authorization: string | null;
}) {
  if (!authorization) return false;

  const match = authorization.match(/Signature:\s*([a-f0-9]+)/i);
  const receivedSignature = match?.[1];

  if (!receivedSignature) return false;

  const { apiKey, secretKey } = getDlocalGoConfig();
  const expectedSignature = createHmac("sha256", secretKey)
    .update(`${apiKey}${rawBody}`)
    .digest("hex");
  const received = Buffer.from(receivedSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  return received.length === expected.length && timingSafeEqual(received, expected);
}
