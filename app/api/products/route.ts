import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";

const MAX_PRODUCTS_TAKE = 80;

function getPaginationValue(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skip = getPaginationValue(url.searchParams.get("skip"), 0, 10_000);
  const take = getPaginationValue(url.searchParams.get("take"), 40, MAX_PRODUCTS_TAKE);

  const products = await prisma.product.findMany({
    where: { isActive: true },
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
      imageUrls: true,
    },
  });

  return NextResponse.json({
    ok: true,
    hasMore: products.length > take,
    products: products.slice(0, take).map((product) => ({
      ...product,
      imageUrls: product.imageUrls.slice(0, 1),
    })),
  });
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
        commissionValue: commissionValue ?? 10,
        commissionType: "PERCENT",
      },
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        stock: true,
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
