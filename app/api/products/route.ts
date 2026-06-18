import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { parseProductColors } from "@/lib/product-color";
import { getRenderableProductImageUrls } from "@/lib/product-images";

const MAX_PRODUCTS_TAKE = 80;

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

  const where = {
      isActive: true,
    };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
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
      },
    }),
    prisma.product.count({ where }),
  ]);

  return NextResponse.json({
    ok: true,
    total,
    hasMore: products.length > take,
    products: products.slice(0, take).map((product) => ({
      id: product.id,
      name: product.name,
      desc: product.desc,
      price: product.price,
      stock: product.stock,
      commissionValue: product.commissionValue,
      colors: parseProductColors(product.colors),
      imageUrls: getRenderableProductImageUrls(product.imageUrls, 1),
    })),
  });
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
