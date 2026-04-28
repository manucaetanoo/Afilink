import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrder } from "@/lib/payments/createOrder";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
  productId?: string;
  quantity?: number;
  clickId?: string;
  campaignClickId?: string;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;
    const items = Array.isArray(body?.items)
      ? (body.items as CheckoutItem[])
      : null;

    if (!productId && (!items || items.length === 0)) {
      return NextResponse.json(
        { ok: false, error: "productId o items requerido" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const clickId = cookieStore.get("aff_click_id")?.value;
    const campaignClickId =
      cookieStore.get("aff_campaign_click_id")?.value;

    if (items?.length) {
      const expandedItems = items.flatMap((item) => {
        const quantity = Math.max(1, Math.min(20, Number(item.quantity || 1)));
        return Array.from({ length: quantity }, () => item);
      });

      const orders = [];

      for (const item of expandedItems) {
        if (!item.productId) continue;

        orders.push(
          await createOrder({
            productId: item.productId,
            clickId: item.clickId || undefined,
            campaignClickId: item.campaignClickId || undefined,
          })
        );
      }

      if (orders.length === 0) {
        return NextResponse.json(
          { ok: false, error: "El carrito no tiene productos validos" },
          { status: 400 }
        );
      }

      const checkoutId =
        orders.length === 1 ? orders[0].id : `cart_${orders[0].id}`;

      if (orders.length > 1) {
        await prisma.order.updateMany({
          where: { id: { in: orders.map((order) => order.id) } },
          data: { paymentId: checkoutId },
        });
      }

      return NextResponse.json(
        {
          ok: true,
          order: {
            id: checkoutId,
            total: orders.reduce((total, order) => total + order.total, 0),
            createdAt: orders[0].createdAt,
          },
          checkout: {
            url: `/checkout/${checkoutId}`,
          },
        },
        { status: 201 }
      );
    }

    const order = await createOrder({
        productId: productId!,
        clickId: clickId || undefined,
        campaignClickId: campaignClickId || undefined,
      });

    return NextResponse.json(
      {
        ok: true,
        order: {
          id: order.id,
          total: order.total,
          createdAt: order.createdAt,
        },
        checkout: {
          url: `/checkout/${order.id}`,
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error(e);

    const message =
      e instanceof Error ? e.message : "Error interno";

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
