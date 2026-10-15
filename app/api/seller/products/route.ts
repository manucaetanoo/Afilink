import { NextResponse } from "next/server";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole, requireUser } from "@/lib/auth";
import { normalizeProductImageUrls } from "@/lib/product-images";
import { normalizeProductDigitalAccessType } from "@/lib/product-access";
import { normalizeProductCategory } from "@/lib/product-categories";

const SELLER_PRODUCTS_LIMIT = 100;
const MAX_SELLER_PRODUCTS_TAKE = 100;

function getPaginationValue(value: string | null, fallback: number, max: number) {
  if (value === null || value.trim() === "") return fallback;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const skip = getPaginationValue(url?.searchParams.get("skip") ?? null, 0, 10_000);
    const take = getPaginationValue(
      url?.searchParams.get("take") ?? null,
      SELLER_PRODUCTS_LIMIT,
      MAX_SELLER_PRODUCTS_TAKE
    );
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const where = user.role === "ADMIN" ? {} : { sellerId: user.id };
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take,
        select: {
          id: true,
          name: true,
          desc: true,
          category: true,
          digitalAccessInstructions: true,
          digitalAccessType: true,
          price: true,
          createdAt: true,
          isActive: true,
          commissionValue: true,
          commissionType: true,
          platformCommissionValue: true,
          platformCommissionType: true,
          imageUrls: true,
          seller: {
            select: {
              platformCommissionValue: true,
              platformCommissionType: true,
            },
          },
        },
      }),
      prisma.product.count({ where }),
    ]);

    const productsWithSellerCommission = products.map(({ seller, ...product }) => ({
      ...product,
      platformCommissionValue: seller.platformCommissionValue,
      platformCommissionType: seller.platformCommissionType,
    }));

    return NextResponse.json({
      ok: true,
      total,
      hasMore: skip + products.length < total,
      products: productsWithSellerCommission,
    });
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
    const category = normalizeProductCategory(body.category ?? "otros");
    if (!category) {
      return NextResponse.json({ ok: false, error: "Categoría inválida" }, { status: 400 });
    }
    const digitalAccessInstructions = String(
      body.digitalAccessInstructions ?? ""
    ).trim();
    const digitalAccessType = normalizeProductDigitalAccessType(
      body.digitalAccessType
    );
    const price = Number(body.price);
    const commissionValue = Number(body.commissionValue);

    const imageUrls = normalizeProductImageUrls(body.imageUrls).slice(0, 1);

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

    if (!Number.isFinite(commissionValue) || commissionValue <= 0 || commissionValue > 100) {
      return NextResponse.json(
        { ok: false, error: "Comision invalida" },
        { status: 400 }
      );
    }

    const sellerSettings = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        platformCommissionValue: true,
        platformCommissionType: true,
      },
    });

    if (!sellerSettings) {
      return NextResponse.json(
        { ok: false, error: "Vendedor no encontrado" },
        { status: 404 }
      );
    }

    const created = await prisma.product.create({
      data: {
        sellerId: user.id,
        name,
        category,
        desc: desc.length ? desc : null,
        digitalAccessInstructions: digitalAccessInstructions.length
          ? digitalAccessInstructions
          : null,
        digitalAccessType,
        price,
        commissionValue,
        commissionType: "PERCENT",
        platformCommissionValue: sellerSettings.platformCommissionValue,
        platformCommissionType: sellerSettings.platformCommissionType,
        imageUrls,
      },
      select: {
        id: true,
        commissionValue: true,
        commissionType: true,
      },
    });

    revalidateTag("products", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("stores", "max");
    revalidatePath("/products");

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
