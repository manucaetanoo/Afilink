import { NextResponse } from "next/server";
import { createMercadoPagoPayment, fetchMercadoPagoPayment, syncOrderWithMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/lib/prisma-enums";
import { rateLimit } from "@/lib/rate-limit";
import { claimPaymentAttempt, PaymentConflict } from "@/lib/payments/attempts";
import { isSessionId } from "@/lib/purchase-analytics";
import { createHash } from "crypto";

function cleanString(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

export async function POST(req: Request) {
  try {
    const limit = rateLimit(req, {
      key: "payments:mercadopago:confirm",
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
    const formData = body?.formData;
    const attemptId = cleanString(body?.attemptId, 36);

    if (!orderId || !isSessionId(attemptId) || !formData || typeof formData !== "object") {
      return NextResponse.json(
        { ok: false, error: "Datos de pago incompletos" },
        { status: 400 }
      );
    }

    const existingOrder = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, paymentStatus: true, preferenceId: true, paymentId: true },
    });

    if (existingOrder?.status === OrderStatus.PAID && existingOrder.paymentId) {
      const attempt = await prisma.paymentAttempt.findUnique({ where: { id: attemptId } });
      if (!attempt || attempt.orderId !== orderId) throw new PaymentConflict("Intento inválido");
      const payment = await fetchMercadoPagoPayment(existingOrder.paymentId);
      if (payment.external_reference !== orderId) throw new PaymentConflict("El pago no corresponde a la orden");
      await syncOrderWithMercadoPagoPayment(payment);
      return NextResponse.json({ ok: true, payment: { id: payment.id, status: payment.status }, checkout: { redirectUrl: payment.status === "approved" ? `/orders/${orderId}/success` : null } });
    }

    if (
      !existingOrder ||
      existingOrder.status !== OrderStatus.PENDING ||
      existingOrder.paymentStatus?.toUpperCase() === "PAID"
    ) {
      return NextResponse.json(
        { ok: false, error: "La orden no esta disponible para pago" },
        { status: 409 }
      );
    }

    if (body.selectedPaymentMethod === "wallet_purchase") {
      if (!existingOrder.preferenceId) throw new PaymentConflict("Prepará el pago antes de continuar");
      const hash = createHash("sha256").update(`wallet:${existingOrder.preferenceId}`).digest("hex");
      const claim = await claimPaymentAttempt(orderId, attemptId, hash, "wallet");
      if (!claim.send) throw new PaymentConflict("Ya hay un pago con Mercado Pago en verificación");
      await prisma.paymentAttempt.updateMany({ where: { id: attemptId, paymentId: null }, data: { status: "pending_wallet" } });
      return NextResponse.json({ ok: true, payment: { status: "pending_wallet" } });
    }

    const payment = await createMercadoPagoPayment({
      orderId,
      formData,
      attemptId,
    });

    return NextResponse.json({
      ok: true,
      orderIds: [orderId],
      payment: { id: payment.id, status: payment.status, status_detail: "status_detail" in payment ? payment.status_detail : undefined },
      checkout: {
        redirectUrl:
          payment.status === "approved" ? `/orders/${orderId}/success` : null,
      },
    });
  } catch (error) {
    console.error("Mercado Pago confirm error:", error);
    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error ? error.message : "No se pudo confirmar el pago",
      },
      { status: error instanceof PaymentConflict ? 409 : 500 }
    );
  }
}
