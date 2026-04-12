import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createOrder } from "@/lib/payments/createOrder";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "productId requerido" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();

    const clickId = cookieStore.get("aff_click_id")?.value;
    const campaignClickId =
      cookieStore.get("aff_campaign_click_id")?.value;

      
      const order = await createOrder({
        productId,
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
