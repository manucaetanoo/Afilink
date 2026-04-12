import { randomUUID } from "crypto";
import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";

type MercadoPagoPreferenceResponse = {
  id: string;
  init_point: string;
  sandbox_init_point?: string | null;
};

type MercadoPagoPaymentFormData = {
  token?: string;
  issuer_id?: string;
  payment_method_id: string;
  transaction_amount?: number;
  installments?: number;
  payer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    identification?: {
      type?: string;
      number?: string;
    };
    address?: {
      zip_code?: string;
      street_name?: string;
      street_number?: string | number;
      neighborhood?: string;
      city?: string;
      federal_unit?: string;
    };
  };
  additional_info?: unknown;
  transaction_details?: unknown;
  payment_method_option_id?: string;
  processing_mode?: string;
};

type MercadoPagoPaymentResponse = {
  id: number | string;
  status?: string;
  external_reference?: string;
  metadata?: {
    orderId?: string;
  };
};

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

function getMercadoPagoHeaders() {
  const accessToken = process.env.MP_ACCESS_TOKEN;

  if (!accessToken) {
    throw new Error("Falta MP_ACCESS_TOKEN en las variables de entorno");
  }

  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
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
      .filter(([, nested]) => nested !== undefined);

    return Object.fromEntries(entries) as T;
  }

  return value;
}

export async function createMercadoPagoPreference(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      product: {
        select: {
          id: true,
          name: true,
          desc: true,
          imageUrls: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada para generar la preferencia");
  }

  const baseUrl = resolveBaseUrl();
  const useAutoReturn = !isLocalUrl(baseUrl);
  const useNotificationUrl = !isLocalUrl(baseUrl);

  const preferencePayload = {
    external_reference: order.id,
    statement_descriptor: "MARKETFILL",
    metadata: {
      orderId: order.id,
      productId: order.productId,
      sellerId: order.sellerId,
      affiliateId: order.affiliateId,
    },
    items: [
      {
        id: order.product.id,
        title: order.product.name,
        description: order.product.desc || undefined,
        quantity: 1,
        currency_id: "UYU",
        unit_price: Number(order.total),
        picture_url: order.product.imageUrls[0] || undefined,
      },
    ],
    back_urls: {
      success: `${baseUrl}/orders/${order.id}/success`,
      failure: `${baseUrl}/checkout?productId=${order.productId}&orderId=${order.id}&status=failure`,
      pending: `${baseUrl}/checkout?productId=${order.productId}&orderId=${order.id}&status=pending`,
    },
    ...(useAutoReturn ? { auto_return: "approved" as const } : {}),
    ...(useNotificationUrl
      ? { notification_url: `${baseUrl}/api/payments/mercadopago/webhook` }
      : {}),
  };

  const response = await fetch("https://api.mercadopago.com/checkout/preferences", {
    method: "POST",
    headers: {
      ...getMercadoPagoHeaders(),
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(preferencePayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mercado Pago rechazo la preferencia: ${errorText}`);
  }

  const preference =
    (await response.json()) as MercadoPagoPreferenceResponse;

  return {
    id: preference.id,
    initPoint: preference.init_point,
    sandboxInitPoint: preference.sandbox_init_point ?? null,
  };
}

export async function fetchMercadoPagoPayment(paymentId: string | number) {
  const response = await fetch(
    `https://api.mercadopago.com/v1/payments/${paymentId}`,
    {
      headers: getMercadoPagoHeaders(),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`No se pudo consultar el pago en Mercado Pago: ${errorText}`);
  }

  return (await response.json()) as MercadoPagoPaymentResponse;
}

export async function syncOrderWithMercadoPagoPayment(
  payment: MercadoPagoPaymentResponse
) {
  const orderId =
    payment.external_reference || String(payment.metadata?.orderId || "");

  if (!orderId) {
    return null;
  }

  if (payment.status === "approved") {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.PAID,
          paymentId: String(payment.id),
          paymentStatus: payment.status,
        },
      });

      await tx.commission.updateMany({
        where: { orderId },
        data: { status: CommissionStatus.APPROVED },
      });

      await tx.settlement.updateMany({
        where: { orderId },
        data: { status: SettlementStatus.AVAILABLE },
      });
    });
  } else if (
    payment.status === "rejected" ||
    payment.status === "cancelled"
  ) {
    await prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.CANCELED,
          paymentId: String(payment.id),
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
        paymentStatus: payment.status,
      },
    });
  }

  return orderId;
}

export async function createMercadoPagoPayment(
  orderId: string,
  formData: MercadoPagoPaymentFormData
) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
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

  const baseUrl = resolveBaseUrl();
  const useNotificationUrl = !isLocalUrl(baseUrl);

  const paymentPayload = cleanUndefined({
    ...formData,
    transaction_amount: Number(order.total),
    description: order.product.name,
    external_reference: order.id,
    metadata: {
      orderId: order.id,
      productId: order.productId,
      sellerId: order.sellerId,
      affiliateId: order.affiliateId,
    },
    ...(useNotificationUrl
      ? { notification_url: `${baseUrl}/api/payments/mercadopago/webhook` }
      : {}),
  });

  const response = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      ...getMercadoPagoHeaders(),
      "X-Idempotency-Key": randomUUID(),
    },
    body: JSON.stringify(paymentPayload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Mercado Pago rechazo el pago: ${errorText}`);
  }

  const payment = (await response.json()) as MercadoPagoPaymentResponse;
  await syncOrderWithMercadoPagoPayment(payment);
  return payment;
}
