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

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const { id } = await params;
    const body = await req.json();

    const data: {
      name?: string;
      desc?: string | null;
      price?: number;
      isActive?: boolean;
      category?: (typeof productCategories)[number];
      sizes?: string[];
      commissionValue?: number;
      commissionType?: "PERCENT" | "FIXED";
      imageUrls?: string[];
    } = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();

      if (name.length < 3) {
        return NextResponse.json(
          { ok: false, error: "Nombre muy corto" },
          { status: 400 }
        );
      }

      data.name = name;
    }

    if (body.desc !== undefined) data.desc = String(body.desc).trim() || null;

    if (body.price !== undefined) {
      const price = Number(body.price);

      if (!Number.isInteger(price) || price <= 0) {
        return NextResponse.json(
          { ok: false, error: "Precio invalido" },
          { status: 400 }
        );
      }

      data.price = price;
    }

    if (body.category !== undefined) {
      const category = String(body.category).trim().toUpperCase();

      if (!productCategories.includes(category as (typeof productCategories)[number])) {
        return NextResponse.json(
          { ok: false, error: "Categoria invalida" },
          { status: 400 }
        );
      }

      data.category = category as (typeof productCategories)[number];
      data.sizes = categoriesWithSizes.has(category)
        ? normalizeSizes(body.sizes)
        : [];
    } else if (body.sizes !== undefined) {
      data.sizes = normalizeSizes(body.sizes);
    }

    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (body.commissionValue !== undefined) {
      const commissionValue = Number(body.commissionValue);

      if (!Number.isInteger(commissionValue) || commissionValue <= 0) {
        return NextResponse.json(
          { ok: false, error: "Comision invalida" },
          { status: 400 }
        );
      }

      data.commissionValue = commissionValue;
    }

    if (body.commissionType !== undefined) {
      const commissionType = String(body.commissionType).trim().toUpperCase();

      if (!["PERCENT", "FIXED"].includes(commissionType)) {
        return NextResponse.json(
          { ok: false, error: "Tipo de comision invalido" },
          { status: 400 }
        );
      }

      data.commissionType = commissionType as "PERCENT" | "FIXED";
    }

    if (body.imageUrls !== undefined) {
      data.imageUrls = Array.isArray(body.imageUrls)
        ? (body.imageUrls as unknown[])
            .filter((url: unknown): url is string => typeof url === "string")
            .map((url) => url.trim())
            .filter(Boolean)
        : [];
    }

    const where = user.role === "ADMIN" ? { id } : { id, sellerId: user.id };

    const updated = await prisma.product.update({
      where,
      data,
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        category: true,
        sizes: true,
        isActive: true,
        commissionValue: true,
        commissionType: true,
        sellerId: true,
        imageUrls: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, product: updated });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
