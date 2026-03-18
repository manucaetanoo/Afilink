import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
  type Prisma,
} from "@prisma/client";

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
            sellerId: true,
            affiliateId: true,
            total: true,
            status: true,
            affiliateAmount: true,
            platformAmount: true,
            sellerAmount: true,
            paymentProvider: true,
            paymentId: true,
            paymentStatus: true,
            commission: { select: { id: true } },
            settlement: { select: { id: true } },
          },
        });

        if (!order) {
          return {
            status: 404 as const,
            body: { ok: false, error: "Order no existe" },
          };
        }

        // idempotencia
        if (order.status === OrderStatus.PAID) {
          return {
            status: 200 as const,
            body: { ok: true, message: "La orden ya estaba pagada" },
          };
        }

        const updatedOrder = await tx.order.update({
          where: { id: order.id },
          data: {
            status: OrderStatus.PAID,
            paymentStatus: "approved",
            paymentProvider: order.paymentProvider ?? "demo",
            paymentId: order.paymentId ?? `demo_${order.id}`,
          },
          select: {
            id: true,
            status: true,
            paymentStatus: true,
            paymentProvider: true,
            paymentId: true,
          },
        });

        let commission = null;

        if (!order.commission && order.affiliateId && order.affiliateAmount > 0) {
          commission = await tx.commission.create({
            data: {
              orderId: order.id,
              affiliateId: order.affiliateId,
              amount: order.affiliateAmount,
              status: CommissionStatus.PENDING,
            },
            select: {
              id: true,
              amount: true,
              status: true,
            },
          });
        }

        let settlement = null;

        if (!order.settlement) {
          settlement = await tx.settlement.create({
            data: {
              orderId: order.id,
              sellerId: order.sellerId,
              grossAmount: order.total,
              platformFee: order.platformAmount,
              affiliateFee: order.affiliateAmount,
              netAmount: order.sellerAmount,
              status: SettlementStatus.AVAILABLE,
            },
            select: {
              id: true,
              grossAmount: true,
              platformFee: true,
              affiliateFee: true,
              netAmount: true,
              status: true,
            },
          });
        }

        return {
          status: 200 as const,
          body: {
            ok: true,
            order: updatedOrder,
            commission,
            settlement,
          },
        };
      }
    );

    return NextResponse.json(result.body, { status: result.status });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { ok: false, error: "Error interno" },
      { status: 500 }
    );
  }
}