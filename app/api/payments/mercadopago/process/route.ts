import { NextResponse } from "next/server";
import { createMercadoPagoPreference } from "@/lib/payments/mercadopago";
import { createCheckoutOrder } from "@/lib/payments/createOrder";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/lib/prisma-enums";
import { rateLimit } from "@/lib/rate-limit";
import { createHash } from "crypto";
import { preparePaymentAttempt, PaymentConflict } from "@/lib/payments/attempts";
import { getPurchaseSession, isSessionId, recordBrowserEvent, getDevice } from "@/lib/purchase-analytics";

type ShippingData = {
  buyerName?: unknown;
  buyerEmail?: unknown;
  buyerPhone?: unknown;
  shippingStreet?: unknown;
  shippingNumber?: unknown;
  shippingApartment?: unknown;
  shippingCity?: unknown;
  shippingState?: unknown;
  shippingPostalCode?: unknown;
  shippingCountry?: unknown;
  shippingNotes?: unknown;
};

type CheckoutItemInput = {
  productId?: unknown;
  quantity?: unknown;
  selectedSize?: unknown;
  selectedColor?: unknown;
  clickId?: unknown;
  campaignClickId?: unknown;
};

const ALLOWED_SHIPPING_COUNTRY = "UY";

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseShippingData(value: unknown) {
  const shipping = (value ?? {}) as ShippingData;
  const data = {
    buyerName: cleanString(shipping.buyerName, 140),
    buyerEmail: cleanString(shipping.buyerEmail, 191).toLowerCase(),
    buyerPhone: cleanString(shipping.buyerPhone, 40),
    shippingStreet: cleanString(shipping.shippingStreet, 160),
    shippingNumber: cleanString(shipping.shippingNumber, 30),
    shippingApartment: cleanString(shipping.shippingApartment, 60) || null,
    shippingCity: cleanString(shipping.shippingCity, 120),
    shippingState: cleanString(shipping.shippingState, 120),
    shippingPostalCode: cleanString(shipping.shippingPostalCode, 20) || null,
    shippingCountry:
      cleanString(shipping.shippingCountry, 2).toUpperCase() ||
      ALLOWED_SHIPPING_COUNTRY,
    shippingNotes: cleanString(shipping.shippingNotes, 1000) || null,
  };

  if (!data.buyerName || !data.buyerEmail || !data.buyerPhone) {
    throw new Error("Datos de acceso incompletos");
  }

  if (!/^\S+@\S+\.\S+$/.test(data.buyerEmail)) {
    throw new Error("Email invalido");
  }

  return data;
}

function isShippingValidationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "Datos de acceso incompletos" ||
      error.message === "Email invalido")
  );
}

function parseItems(items: CheckoutItemInput[]) {
  return items
    .filter((item) => item?.productId)
    .map((item) => ({
      productId: String(item.productId),
      quantity: Number(item.quantity || 1),
      selectedSize:
        typeof item.selectedSize === "string" ? item.selectedSize : undefined,
      selectedColor:
        typeof item.selectedColor === "string" ? item.selectedColor : undefined,
      clickId: typeof item.clickId === "string" ? item.clickId : undefined,
      campaignClickId:
        typeof item.campaignClickId === "string" ? item.campaignClickId : undefined,
    }));
}

export async function POST(req: Request) {
  let resolvedOrderId = "";
  try {
    const limit = rateLimit(req, {
      key: "payments:mercadopago:process",
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return NextResponse.json(
        { ok: false, error: "Demasiados intentos" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const body = await req.json();
    const orderId = cleanString(body?.orderId, 191);
    const items = Array.isArray(body?.items)
      ? (body.items as CheckoutItemInput[])
      : null;

    if (!orderId && (!items || items.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "orderId o items requerido" },
        { status: 400 }
      );
    }

    const shippingData = parseShippingData(body?.shippingData);
    const sessionId = await getPurchaseSession();
    resolvedOrderId = orderId;

    if (!resolvedOrderId && items?.length) {
      if (!isSessionId(body.checkoutId) || items.length !== 1) return NextResponse.json({ ok: false, error: "Checkout inválido" }, { status: 400 });
      const checkoutKey = createHash("sha256").update(body.checkoutId).digest("hex");
      const order = await createCheckoutOrder(parseItems(items), shippingData, { sessionId, checkoutKey });
      resolvedOrderId = order.id;
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: resolvedOrderId },
      select: { id: true, status: true, paymentStatus: true, productId: true, sessionId: true, total: true },
    });

    if (
      !existingOrder ||
      (existingOrder.status !== OrderStatus.PENDING && existingOrder.paymentStatus !== "rejected") ||
      existingOrder.paymentStatus?.toUpperCase() === "PAID"
    ) {
      return NextResponse.json(
        { ok: false, error: "La orden no esta disponible para pago" },
        { status: 409 }
      );
    }

    await prisma.order.update({
      where: { id: resolvedOrderId },
      data: shippingData,
    });
    const attempt = await preparePaymentAttempt(resolvedOrderId);
    await recordBrowserEvent({ name: "details_submitted", eventKey: `order:${resolvedOrderId}:details`, sessionId: existingOrder.sessionId ?? sessionId, orderId: resolvedOrderId, productId: existingOrder.productId, device: getDevice(req.headers.get("user-agent")) });

    const preference = await createMercadoPagoPreference(
      resolvedOrderId,
      shippingData
    );

    return NextResponse.json({
      ok: true,
      orderIds: [resolvedOrderId],
      attemptId: attempt.id,
      total: existingOrder.total,
      payment: {
        status: attempt.status,
      },
      checkout: {
        preferenceId: preference.id,
      },
    });
  } catch (error) {
    console.error("Mercado Pago process error:", error);
    return NextResponse.json(
      {
        ok: false,
        orderIds: resolvedOrderId ? [resolvedOrderId] : [],
        error:
          error instanceof Error ? error.message : "No se pudo procesar el pago",
      },
      { status: error instanceof PaymentConflict ? 409 : isShippingValidationError(error) ? 400 : 500 }
    );
  }
}
