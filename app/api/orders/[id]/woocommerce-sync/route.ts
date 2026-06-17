import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OrderStatus } from "@/lib/prisma-enums";
import { syncWooCommerceOrder } from "@/lib/woocommerce-orders";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const { id } = await params;
    const order = await prisma.order.findUnique({
      where: { id },
      select: {
        id: true,
        status: true,
        items: {
          select: {
            sellerId: true,
            product: {
              select: {
                wooCommerceProductId: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Orden no encontrada" },
        { status: 404 }
      );
    }

    if (
      user.role !== "ADMIN" &&
      !order.items.some((item) => item.sellerId === user.id)
    ) {
      return NextResponse.json({ ok: false, error: "FORBIDDEN" }, { status: 403 });
    }

    if (order.status !== OrderStatus.PAID) {
      return NextResponse.json(
        { ok: false, error: "Solo se sincronizan ordenes pagadas" },
        { status: 409 }
      );
    }

    if (!order.items.some((item) => item.product.wooCommerceProductId)) {
      return NextResponse.json(
        { ok: false, error: "La orden no tiene productos WooCommerce" },
        { status: 400 }
      );
    }

    const results = await syncWooCommerceOrder(order.id);

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const msg = getErrorMessage(error);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
