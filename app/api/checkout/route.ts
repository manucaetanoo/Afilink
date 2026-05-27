import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { isShopifyEnabled } from "@/lib/features";

type CheckoutItem = {
  productId?: string;
  quantity?: number;
  selectedSize?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

type ShopifyVariantMetadata = {
  id?: unknown;
  option1?: unknown;
  option2?: unknown;
  option3?: unknown;
};

function encodeCheckoutItems(items: CheckoutItem[]) {
  return Buffer.from(JSON.stringify(items)).toString("base64url");
}

function getShopifyVariantId({
  fallbackVariantId,
  variants,
  selectedSize,
}: {
  fallbackVariantId: string | null;
  variants: unknown;
  selectedSize?: string;
}) {
  const cleanSelectedSize = selectedSize?.trim().toUpperCase();

  if (cleanSelectedSize && Array.isArray(variants)) {
    const matchedVariant = variants.find((variant): variant is ShopifyVariantMetadata => {
      if (!variant || typeof variant !== "object") return false;

      return [variant.option1, variant.option2, variant.option3].some(
        (option) =>
          typeof option === "string" &&
          option.trim().toUpperCase() === cleanSelectedSize
      );
    });

    const matchedId = matchedVariant?.id;
    if (typeof matchedId === "string" && matchedId.trim()) return matchedId.trim();
    if (typeof matchedId === "number" && Number.isFinite(matchedId)) {
      return String(matchedId);
    }
  }

  return fallbackVariantId?.trim() || null;
}

function createShopifyCheckoutUrl({
  shopDomain,
  variantId,
  quantity,
  productId,
  refCode,
  clickId,
  campaignClickId,
}: {
  shopDomain: string;
  variantId: string;
  quantity: number;
  productId: string;
  refCode?: string;
  clickId?: string;
  campaignClickId?: string;
}) {
  const url = new URL(`/cart/${variantId}:${quantity}`, `https://${shopDomain}`);

  url.searchParams.set("utm_source", "afilink");
  url.searchParams.set("attributes[afilink_product_id]", productId);

  if (refCode) url.searchParams.set("attributes[afilink_ref_code]", refCode);
  if (clickId) url.searchParams.set("attributes[afilink_click_id]", clickId);
  if (campaignClickId) {
    url.searchParams.set("attributes[afilink_campaign_click_id]", campaignClickId);
  }

  return url.toString();
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

    if (isShopifyEnabled()) {
      const product = await prisma.product.findUnique({
        where: { id: productId! },
        select: {
          id: true,
          shopifyShopDomain: true,
          shopifyVariantId: true,
          shopifyVariants: true,
        },
      });

      if (product?.shopifyShopDomain && product.shopifyVariantId) {
        const variantId = getShopifyVariantId({
          fallbackVariantId: product.shopifyVariantId,
          variants: product.shopifyVariants,
          selectedSize,
        });

        if (!variantId) {
          return NextResponse.json(
            { ok: false, error: "Este producto de Shopify no tiene variante para comprar" },
            { status: 400 }
          );
        }

        return NextResponse.json(
          {
            ok: true,
            checkout: {
              provider: "shopify",
              url: createShopifyCheckoutUrl({
                shopDomain: product.shopifyShopDomain,
                variantId,
                quantity: 1,
                productId: product.id,
                refCode,
                clickId: clickId || undefined,
                campaignClickId: campaignClickId || undefined,
              }),
            },
          },
          { status: 200 }
        );
      }
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
