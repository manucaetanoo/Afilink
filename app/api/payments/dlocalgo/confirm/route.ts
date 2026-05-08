import { NextResponse } from "next/server";
import { confirmDlocalGoPayment } from "@/lib/payments/dlocalgo";
import { createCheckoutOrder } from "@/lib/payments/createOrder";
import { prisma } from "@/lib/prisma";

type CheckoutItemInput = {
  productId?: unknown;
  quantity?: unknown;
  selectedSize?: unknown;
  clickId?: unknown;
  campaignClickId?: unknown;
};

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = cleanString(body?.orderId, 191);
    const checkoutToken = cleanString(body?.checkoutToken, 500);
    const cardToken = cleanString(body?.cardToken, 500);
    const clientFirstName = cleanString(body?.clientFirstName, 100);
    const clientLastName = cleanString(body?.clientLastName, 100);
    const clientDocumentType = cleanString(body?.clientDocumentType, 20);
    const clientDocument = cleanString(body?.clientDocument, 40);
    const clientEmail = cleanString(body?.clientEmail, 191).toLowerCase();
    const installmentsId = cleanString(body?.installmentsId, 191) || undefined;
    const items = Array.isArray(body?.items)
      ? (body.items as CheckoutItemInput[])
      : null;
    const shippingData = !orderId && items?.length
      ? parseShippingData(body?.shippingData)
      : null;

    if (
      (!orderId && (!items || items.length === 0)) ||
      !checkoutToken ||
      !cardToken ||
      !clientFirstName ||
      !clientDocumentType ||
      !clientDocument ||
      !clientEmail
    ) {
      return NextResponse.json(
        { ok: false, error: "Datos de pago incompletos" },
        { status: 400 }
      );
    }

    if (!/^\S+@\S+\.\S+$/.test(clientEmail)) {
      return NextResponse.json(
        { ok: false, error: "Email invalido" },
        { status: 400 }
      );
    }

    let resolvedOrderId = orderId;

    if (!resolvedOrderId && items?.length) {
      const order = await createCheckoutOrder(
        items
          .filter((item) => item?.productId)
          .map((item) => ({
            productId: String(item.productId),
            quantity: Number(item.quantity || 1),
            selectedSize:
              typeof item.selectedSize === "string" ? item.selectedSize : undefined,
            clickId: typeof item.clickId === "string" ? item.clickId : undefined,
            campaignClickId:
              typeof item.campaignClickId === "string"
                ? item.campaignClickId
                : undefined,
          })),
        shippingData ?? undefined
      );

      resolvedOrderId = order.id;
    }

    let payment: Awaited<ReturnType<typeof confirmDlocalGoPayment>>;

    try {
      payment = await confirmDlocalGoPayment({
        orderId: resolvedOrderId,
        checkoutToken,
        cardToken,
        clientFirstName,
        clientLastName,
        clientDocumentType,
        clientDocument,
        clientEmail,
        installmentsId,
      });
    } catch (paymentError) {
      if (!orderId && resolvedOrderId) {
        await prisma.order.delete({
          where: { id: resolvedOrderId },
        });
      }

      throw paymentError;
    }

    return NextResponse.json({
      ok: true,
      orderIds: [resolvedOrderId],
      payment,
      checkout: {
        redirectUrl: payment.redirect_url,
      },
    });
  } catch (error) {
    console.error("dLocal Go confirm error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo confirmar el pago",
      },
      { status: 500 }
    );
  }
}
