import { NextResponse } from "next/server";
import { createMercadoPagoPayment } from "@/lib/payments/mercadopago";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const orderId = body?.orderId as string | undefined;
    const formData = body?.formData;

    if (!orderId) {
      return NextResponse.json(
        { ok: false, error: "orderId requerido" },
        { status: 400 }
      );
    }

    if (!formData || typeof formData !== "object") {
      return NextResponse.json(
        { ok: false, error: "formData requerido" },
        { status: 400 }
      );
    }

    const payment = await createMercadoPagoPayment(orderId, formData);

    return NextResponse.json({
      ok: true,
      payment: {
        id: String(payment.id),
        status: payment.status ?? "pending",
      },
    });
  } catch (error) {
    console.error("Mercado Pago process error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo procesar el pago",
      },
      { status: 500 }
    );
  }
}
