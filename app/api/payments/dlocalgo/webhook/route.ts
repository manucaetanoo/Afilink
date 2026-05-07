import { NextRequest, NextResponse } from "next/server";
import {
  fetchDlocalGoPayment,
  syncOrderWithDlocalGoPayment,
  verifyDlocalGoNotificationSignature,
} from "@/lib/payments/dlocalgo";

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const isValidSignature = verifyDlocalGoNotificationSignature({
      rawBody,
      authorization: req.headers.get("authorization"),
    });

    if (!isValidSignature) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = JSON.parse(rawBody) as { payment_id?: string };
    const paymentId = body.payment_id;

    if (!paymentId) {
      return NextResponse.json({ ok: true });
    }

    const payment = await fetchDlocalGoPayment(paymentId);
    await syncOrderWithDlocalGoPayment(payment);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Webhook dLocal Go error:", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
