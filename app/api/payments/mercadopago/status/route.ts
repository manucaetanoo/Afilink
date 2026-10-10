import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { reconcileMercadoPagoOrder } from "@/lib/payments/mercadopago";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limit = rateLimit(req, { key: "payments:status", limit: 30, windowMs: 60_000 });
  if (!limit.ok) return NextResponse.json({ ok: false }, { status: 429 });
  const body = await req.json().catch(() => null);
  if (typeof body?.orderId !== "string" || body.orderId.length > 191) return NextResponse.json({ ok: false }, { status: 400 });
  try {
    const order = await reconcileMercadoPagoOrder(body.orderId);
    const attempt = await prisma.paymentAttempt.findFirst({ where: { orderId: order.id }, orderBy: { createdAt: "desc" } });
    return NextResponse.json({ ok: true, orderStatus: order.status, payment: { status: order.paymentStatus }, attemptStatus: attempt?.status,
      redirectUrl: order.status === "PAID" ? `/orders/${order.id}/success` : null });
  } catch {
    return NextResponse.json({ ok: false, error: "No pudimos verificar el pago. No vuelvas a pagar hasta consultar su estado." }, { status: 503 });
  }
}
