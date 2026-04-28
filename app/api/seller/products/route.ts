import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";

const productCategories = [
  "CLOTHING",
  "SHOES",
  "ACCESSORIES",
  "BEAUTY",
  "HOME",
  "DIGITAL",
  "OTHER",
] as const;

const categoriesWithSizes = new Set(["CLOTHING", "SHOES"]);

function normalizeSizes(value: unknown) {
  if (!Array.isArray(value)) return [];

  return Array.from(
    new Set(
      value
        .filter((size): size is string => typeof size === "string")
        .map((size) => size.trim().toUpperCase())
        .filter(Boolean)
    )
  ).slice(0, 20);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const products = await prisma.product.findMany({
      where: user.role === "ADMIN" ? {} : { sellerId: user.id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        category: true,
        sizes: true,
        createdAt: true,
        isActive: true,
        commissionValue: true,
        commissionType: true,
        imageUrls: true,
      },
    });

    return NextResponse.json({ ok: true, products });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 500;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const desc = String(body.desc ?? "").trim();
    const price = Number(body.price);
    const commissionValue = Number(body.commissionValue);
    const commissionType = body.commissionType as "PERCENT" | "FIXED";
    const category = String(body.category ?? "OTHER").trim().toUpperCase();
    const sizes = normalizeSizes(body.sizes);

    const imageUrlsRaw = body.imageUrls;
    const imageUrls: string[] = Array.isArray(imageUrlsRaw)
      ? imageUrlsRaw
          .filter((url: unknown): url is string => typeof url === "string")
          .map((url) => url.trim())
          .filter(Boolean)
      : [];

    if (name.length < 3) {
      return NextResponse.json(
        { ok: false, error: "Nombre muy corto" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json(
        { ok: false, error: "Precio invalido" },
        { status: 400 }
      );
    }

    if (!Number.isFinite(commissionValue) || commissionValue <= 0) {
      return NextResponse.json(
        { ok: false, error: "Comision invalida" },
        { status: 400 }
      );
    }

    if (!["PERCENT", "FIXED"].includes(commissionType)) {
      return NextResponse.json(
        { ok: false, error: "Tipo de comision invalido" },
        { status: 400 }
      );
    }

    if (!productCategories.includes(category as (typeof productCategories)[number])) {
      return NextResponse.json(
        { ok: false, error: "Categoria invalida" },
        { status: 400 }
      );
    }

    const created = await prisma.product.create({
      data: {
        sellerId: user.id,
        name,
        desc: desc.length ? desc : null,
        price,
        category: category as (typeof productCategories)[number],
        sizes: categoriesWithSizes.has(category) ? sizes : [],
        commissionValue,
        commissionType,
        imageUrls,
      },
      select: {
        id: true,
        category: true,
        sizes: true,
        commissionValue: true,
        commissionType: true,
      },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
