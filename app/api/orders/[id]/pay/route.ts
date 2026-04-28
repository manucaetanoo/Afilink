import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@prisma/client";
import { markOrderPaidAndNotify } from "@/lib/order-events";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
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
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}
