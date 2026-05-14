import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/lib/prisma-enums";
import { markOrderPaidAndNotify } from "@/lib/order-events";
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

    if (order.status === OrderStatus.PAID) {
      return NextResponse.json(
        { ok: true, message: "La orden ya estaba pagada" },
        { status: 200 }
      );
    }

    await markOrderPaidAndNotify({
      orderId,
      paymentProvider: order.paymentProvider ?? "demo",
      paymentId: order.paymentId ?? `demo_${orderId}`,
      paymentStatus: "approved",
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error(e);
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
