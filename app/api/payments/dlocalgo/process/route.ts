import { NextResponse } from "next/server";
import { createDlocalGoPayment } from "@/lib/payments/dlocalgo";
import { prisma } from "@/lib/prisma";

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
    shippingCountry: cleanString(shipping.shippingCountry, 2).toUpperCase() || "UY",
    shippingNotes: cleanString(shipping.shippingNotes, 1000) || null,
  };

  if (
    !data.buyerName ||
    !data.buyerEmail ||
    !data.buyerPhone ||
    !data.shippingStreet ||
    !data.shippingNumber ||
    !data.shippingCity ||
    !data.shippingState
  ) {
    throw new Error("Datos de entrega incompletos");
  }

  if (!/^\S+@\S+\.\S+$/.test(data.buyerEmail)) {
    throw new Error("Email de entrega invalido");
  }

  return data;
}

function isShippingValidationError(error: unknown) {
  return (
    error instanceof Error &&
    (error.message === "Datos de entrega incompletos" ||
      error.message === "Email de entrega invalido")
  );
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = body?.orderId as string | undefined;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId requerido" },
        { status: 400 }
      );
    }

    const shippingData = parseShippingData(body?.shippingData);
    await prisma.order.update({
      where: { id: orderId },
      data: shippingData,
    });

    const payment = await createDlocalGoPayment(orderId, shippingData);

    return NextResponse.json({
      ok: true,
      orderIds: [orderId],
      payment: {
        id: payment.id,
        status: payment.status ?? "PENDING",
        merchantCheckoutToken: payment.merchant_checkout_token,
      },
      checkout: {
        redirectUrl: null,
      },
    });
  } catch (error) {
    console.error("dLocal Go process error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo procesar el pago",
      },
      { status: isShippingValidationError(error) ? 400 : 500 }
    );
  }
}
