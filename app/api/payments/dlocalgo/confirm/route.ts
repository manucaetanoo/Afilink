import { NextResponse } from "next/server";
import { confirmDlocalGoPayment } from "@/lib/payments/dlocalgo";

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
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

    if (
      !orderId ||
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

    const payment = await confirmDlocalGoPayment({
      orderId,
      checkoutToken,
      cardToken,
      clientFirstName,
      clientLastName,
      clientDocumentType,
      clientDocument,
      clientEmail,
      installmentsId,
    });

    return NextResponse.json({
      ok: true,
      orderIds: [orderId],
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
