import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

type CheckoutItem = {
  productId?: string;
  quantity?: number;
  selectedSize?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

function encodeCheckoutItems(items: CheckoutItem[]) {
  return Buffer.from(JSON.stringify(items)).toString("base64url");
}

async function createClickFromRef({
  productId,
  refCode,
  req,
}: {
  productId: string;
  refCode?: string;
  req: Request;
}) {
  if (!refCode) return null;

  const link = await prisma.affiliateLink.findUnique({
    where: { code: refCode },
    select: { id: true, productId: true },
  });

  if (!link || link.productId !== productId) return null;

  const xff = req.headers.get("x-forwarded-for");
  const ip = xff ? xff.split(",")[0].trim() : null;

  const click = await prisma.click.create({
    data: {
      linkId: link.id,
      ip,
      userAgent: req.headers.get("user-agent"),
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
    const refCode: string | undefined =
      typeof body?.refCode === "string" ? body.refCode : undefined;
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

    const clickId =
      cookieStore.get("aff_click_id")?.value ||
      (productId
        ? await createClickFromRef({ productId, refCode, req })
        : null);
        
    const campaignClickId =
      cookieStore.get("aff_campaign_click_id")?.value;

    if (items?.length) {
      const checkoutItems = items
        .filter((item) => item.productId)
        .map((item) => ({
          productId: item.productId!,
          quantity: item.quantity,
          selectedSize:
            typeof item.selectedSize === "string" ? item.selectedSize : undefined,
          clickId: item.clickId || undefined,
          campaignClickId: item.campaignClickId || undefined,
        }));

      return NextResponse.json(
        {
          ok: true,
          checkout: {
            url: `/checkout?items=${encodeURIComponent(
              encodeCheckoutItems(checkoutItems)
            )}`,
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        ok: true,
        checkout: {
          url: `/checkout?items=${encodeURIComponent(
            encodeCheckoutItems([
              {
                productId: productId!,
                selectedSize,
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
