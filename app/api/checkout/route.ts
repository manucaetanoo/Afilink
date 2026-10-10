import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { getPurchaseSession } from "@/lib/purchase-analytics";

type CheckoutItem = {
  productId?: string;
  quantity?: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

function encodeCheckoutItems(items: CheckoutItem[]) {
  return Buffer.from(JSON.stringify(items)).toString("base64url");
}

async function createClickFromRef({
  productId,
  refCode,
  cookieClickId,
  req,
  sessionId,
}: {
  productId: string;
  refCode?: string;
  cookieClickId?: string;
  req: Request;
  sessionId: string;
}) {
  if (!refCode) return null;

  const link = await prisma.affiliateLink.findUnique({
    where: { code: refCode },
    select: { id: true, productId: true },
  });

  if (!link || link.productId !== productId) return null;

  if (cookieClickId) {
    const existing = await prisma.click.findUnique({ where: { id: cookieClickId }, select: { linkId: true } });
    if (existing?.linkId === link.id) return cookieClickId;
  }

  const xff = req.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : null;

  const click = await prisma.click.create({
    data: {
      linkId: link.id,
      ip,
      userAgent: req.headers.get("user-agent"),
      sessionId,
    },
    select: { id: true },
  });

  return click.id;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;
    const selectedSize: string | undefined =
      typeof body?.selectedSize === "string" ? body.selectedSize : undefined;
    const selectedColor: string | undefined =
      typeof body?.selectedColor === "string" ? body.selectedColor : undefined;
    const refCode: string | undefined =
      typeof body?.refCode === "string" ? body.refCode : undefined;
    const items = Array.isArray(body?.items)
      ? (body.items as CheckoutItem[])
      : null;

    if (items?.length) {
      return NextResponse.json(
        {
          ok: false,
          error: "El carrito ya no esta disponible. Compra un producto por vez.",
        },
        { status: 400 }
      );
    }

    if (!productId) {
      return NextResponse.json(
        { ok: false, error: "productId requerido" },
        { status: 400 }
      );
    }

    const cookieStore = await cookies();
    const sessionId = await getPurchaseSession();

    const cookieClickId = cookieStore.get("aff_click_id")?.value;
    const explicitClickId = await createClickFromRef({ productId, refCode, cookieClickId, req, sessionId });
    const cookieClick = !explicitClickId && cookieClickId
      ? await prisma.click.findUnique({ where: { id: cookieClickId }, select: { link: { select: { productId: true } } } })
      : null;
    const clickId = explicitClickId || (cookieClick?.link.productId === productId ? cookieClickId : undefined);
    const campaignClickId = explicitClickId ? undefined : cookieStore.get("aff_campaign_click_id")?.value;
    if (explicitClickId && explicitClickId !== cookieClickId) {
      const options = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 30 * 24 * 60 * 60 };
      cookieStore.set("aff_click_id", explicitClickId, options);
      cookieStore.set("aff_code", refCode!, options);
      cookieStore.delete("aff_campaign_click_id");
      cookieStore.delete("aff_campaign_code");
    }

    return NextResponse.json(
      {
        ok: true,
        checkout: {
          url: `/checkout?checkoutId=${randomUUID()}&items=${encodeURIComponent(
            encodeCheckoutItems([
              {
                productId: productId!,
                selectedSize,
                selectedColor,
                clickId: clickId || undefined,
                campaignClickId: campaignClickId || undefined,
              },
            ])
          )}`,
        },
      },
      { status: 200 }
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
