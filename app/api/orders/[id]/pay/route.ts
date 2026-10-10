import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchMercadoPagoPayment, syncOrderWithMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { requireUser, requireRole } from "@/lib/auth";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["ADMIN"]);

    const { id: orderId } = await params;
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        status: true,
        paymentProvider: true,
        paymentId: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Order no existe" },
        { status: 404 }
      );
    }

    if (order.paymentProvider !== "mercadopago" || !order.paymentId) return NextResponse.json({ ok: false, error: "La orden no tiene un pago verificable en Mercado Pago" }, { status: 409 });
    const payment = await fetchMercadoPagoPayment(order.paymentId);
    if (payment.external_reference !== orderId || payment.status !== "approved") return NextResponse.json({ ok: false, error: "Mercado Pago todavía no aprobó este pago" }, { status: 409 });
    await syncOrderWithMercadoPagoPayment(payment);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error(e);
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
