import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isShopifyEnabled } from "@/lib/features";
import { parseProductColors } from "@/lib/product-color";

const MAX_PRODUCTS_TAKE = 80;
type ProductSourceFilter = "all" | "afilink" | "shopify";

function getPaginationValue(value: string | null, fallback: number, max: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skip = getPaginationValue(url.searchParams.get("skip"), 0, 10_000);
  const take = getPaginationValue(url.searchParams.get("take"), 40, MAX_PRODUCTS_TAKE);
  const shopifyEnabled = isShopifyEnabled();
  const source = shopifyEnabled
    ? parseSourceFilter(url.searchParams.get("source"))
    : "all";

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(source === "shopify"
        ? { shopifyShopDomain: { not: null }, shopifyVariantId: { not: null } }
        : source === "afilink"
          ? { shopifyVariantId: null }
          : {}),
    },
    orderBy: [{ commissionValue: "desc" }, { createdAt: "desc" }],
    skip,
    take: take + 1,
    select: {
      id: true,
      name: true,
      desc: true,
      price: true,
      stock: true,
      commissionValue: true,
      colors: true,
      imageUrls: true,
      shopifyShopDomain: true,
      shopifyVariantId: true,
    },
  });

  return NextResponse.json({
    ok: true,
    hasMore: products.length > take,
    products: products.slice(0, take).map((product) => ({
      id: product.id,
      name: product.name,
      desc: product.desc,
      price: product.price,
      stock: product.stock,
      commissionValue: product.commissionValue,
      colors: parseProductColors(product.colors),
      imageUrls: product.imageUrls.slice(0, 1),
      isShopifyProduct:
        shopifyEnabled && Boolean(product.shopifyShopDomain && product.shopifyVariantId),
    })),
  });
}

function parseSourceFilter(value: string | null): ProductSourceFilter {
  if (value === "afilink" || value === "shopify") return value;
  return "all";
}

export async function POST() {
  try {
    return NextResponse.json(
      { error: "Usa /api/seller/products para crear productos autenticados" },
      { status: 410 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error creando producto" },
      { status: 500 }
    );
  }
}
