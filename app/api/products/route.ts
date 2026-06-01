import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { isShopifyEnabled } from "@/lib/features";
import { normalizeProductColors, parseProductColors } from "@/lib/product-color";

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

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sellerId, name, desc, price, stock, commissionValue } = body as {
      sellerId: string;
      name: string;
      desc?: string | null;
      price: number;
      stock?: number;
      commissionValue?: number;
    };
    const colors = normalizeProductColors(body.colors);

    if (!sellerId || !name || typeof price !== "number") {
      return NextResponse.json(
        { error: "Faltan datos: sellerId, name, price (number)" },
        { status: 400 }
      );
    }

    if (
      stock !== undefined &&
      (!Number.isInteger(stock) || stock < 0)
    ) {
      return NextResponse.json(
        { error: "Stock invalido" },
        { status: 400 }
      );
    }

    if (
      commissionValue !== undefined &&
      (!Number.isFinite(commissionValue) || commissionValue <= 0 || commissionValue > 100)
    ) {
      return NextResponse.json(
        { error: "Comision invalida" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sellerId,
        name,
        desc: desc ?? null,
        price,
        stock: stock ?? 0,
        colors: colors.length ? colors : undefined,
        commissionValue: commissionValue ?? 10,
        commissionType: "PERCENT",
      },
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        stock: true,
        colors: true,
        sellerId: true,
        commissionValue: true, 
      },
    });

    revalidateTag("products", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("stores", "max");
    revalidatePath("/products");
    revalidatePath("/campaigns");
    revalidatePath("/store");

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error creando producto" },
      { status: 500 }
    );
  }
}
