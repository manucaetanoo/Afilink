import { NextResponse } from "next/server";
import { getCatalogProducts } from "@/lib/products-catalog";
import { normalizeCatalogFilter, normalizeCatalogSearch } from "@/lib/product-categories";

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
  const take = getPaginationValue(url.searchParams.get("take"), 40, MAX_PRODUCTS_TAKE) || 40;
  const search = normalizeCatalogSearch(url.searchParams.get("q"));
  const category = normalizeCatalogFilter(url.searchParams.get("category"));
  const result = await getCatalogProducts({ search, category, skip, take });
  return NextResponse.json({ ok: true, ...result });
}

export async function POST() {
  return NextResponse.json(
    { error: "Usa /api/seller/products para crear productos autenticados" },
    { status: 410 }
  );
}
