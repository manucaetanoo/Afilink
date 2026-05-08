import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  CommissionStatus,
  FulfillmentStatus,
  OrderStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["ADMIN"]);

    const { id } = await params;
    await req.json().catch(() => ({}));

    const result = await prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        select: {
          id: true,
          status: true,
          items: {
            select: {
              productId: true,
              quantity: true,
            },
          },
          settlements: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      });

      if (!order) {
        return {
          status: 404 as const,
          body: { ok: false, error: "Orden no encontrada" },
        };
      }

      if (order.status === OrderStatus.CANCELED) {
        return {
          status: 400 as const,
          body: { ok: false, error: "La orden ya esta cancelada" },
        };
      }

      if (order.settlements.some((settlement) => settlement.status === SettlementStatus.PAID)) {
        return {
          status: 400 as const,
          body: {
            ok: false,
            error:
              "No se puede cancelar automaticamente una orden con liquidaciones ya pagadas",
          },
        };
      }

      if (order.status === OrderStatus.PAID) {
        const stockByProduct = new Map<string, number>();

        for (const item of order.items) {
          stockByProduct.set(
            item.productId,
            (stockByProduct.get(item.productId) ?? 0) + item.quantity
          );
        }

        for (const [productId, quantity] of stockByProduct) {
          await tx.product.update({
            where: { id: productId },
            data: {
              stock: {
                increment: quantity,
              },
            },
          });
        }
      }

      await tx.order.update({
        where: { id: order.id },
        data: {
          status: OrderStatus.CANCELED,
          paymentStatus: order.status === OrderStatus.PAID ? "REFUNDED" : "CANCELED",
        },
      });

      await tx.commission.updateMany({
        where: { orderId: order.id },
        data: { status: CommissionStatus.CANCELED },
      });

      await tx.settlement.updateMany({
        where: { orderId: order.id },
        data: {
          status: SettlementStatus.CANCELED,
          fulfillmentStatus: FulfillmentStatus.CANCELED,
        },
      });

      return {
        status: 200 as const,
        body: { ok: true },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (error) {
    const msg = getErrorMessage(error);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
