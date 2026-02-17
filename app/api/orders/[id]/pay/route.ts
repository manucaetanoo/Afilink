import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function POST(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const result = await prisma.$transaction(
      async (tx: Prisma.TransactionClient) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: {
            id: true,
            total: true,
            clickId: true,
            commission: { select: { id: true } },
            product: { select: { commissionValue: true } }, // 👈 traemos comisión del producto
          },
        });

        if (!order)
          return { status: 404 as const, body: { ok: false, error: "Order no existe" } };

        if (order.commission)
          return { status: 200 as const, body: { ok: true, message: "Ya estaba comisionada" } };

        if (!order.clickId)
          return { status: 200 as const, body: { ok: true, message: "Orden sin atribución" } };

        const click = await tx.click.findUnique({
          where: { id: order.clickId },
          select: { linkId: true },
        });

        if (!click)
          return { status: 200 as const, body: { ok: true, message: "clickId inválido" } };

        const link = await tx.affiliateLink.findUnique({
          where: { id: click.linkId },
          select: { affiliateId: true },
        });

        if (!link)
          return { status: 200 as const, body: { ok: true, message: "Link no existe" } };

        // 👇 cálculo dinámico
        const percent = order.product?.commissionValue ?? 0;
        const amount = Math.floor((order.total * percent) / 100);

        const commission = await tx.commission.create({
          data: {
            orderId: order.id,
            affiliateId: link.affiliateId,
            amount,
            status: "PENDING",
          },
          select: { id: true, amount: true, status: true },
        });

        return { status: 200 as const, body: { ok: true, commission } };
      }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: "Error interno" }, { status: 500 });
  }
}
