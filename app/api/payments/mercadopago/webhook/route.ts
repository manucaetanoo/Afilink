import { NextRequest, NextResponse } from "next/server";
import {
  fetchMercadoPagoPayment,
  syncOrderWithMercadoPagoPayment,
} from "@/lib/payments/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const type = body.type;
    const paymentId = body.data?.id;

    if (type !== "payment" || !paymentId) {
      return NextResponse.json({ ok: true });
    }

    const payment = await fetchMercadoPagoPayment(paymentId);
    await syncOrderWithMercadoPagoPayment(payment);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook Mercado Pago error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
