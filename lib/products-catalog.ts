import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getRenderableProductImageUrls } from "@/lib/product-images";
import { DEFAULT_CATALOG_FILTER, isProductCategory, normalizeCatalogFilter, normalizeCatalogSearch } from "@/lib/product-categories";

export function catalogWhere(search: string, category: string): Prisma.ProductWhereInput {
  const filter = normalizeCatalogFilter(category);
  const words = normalizeCatalogSearch(search).split(" ").filter(Boolean);
  return {
    isActive: true,
    ...(filter === "bienestar"
      ? { category: { in: ["bienestar", "desarrollo-personal"] } }
      : isProductCategory(filter) ? { category: filter } : {}),
    ...(words.length ? {
      AND: words.map((word) => ({
        OR: [
          { name: { contains: word, mode: "insensitive" as const } },
          { desc: { contains: word, mode: "insensitive" as const } },
        ],
      })),
    } : {}),
  };
}

export async function getCatalogProducts({
  search = "", category = DEFAULT_CATALOG_FILTER, skip = 0, take = 40,
}: { search?: string; category?: string; skip?: number; take?: number } = {}) {
  const where = catalogWhere(search, category);
  const filter = normalizeCatalogFilter(category);
  const orderBy: Prisma.ProductOrderByWithRelationInput[] = filter === "todos"
    ? [{ createdAt: "desc" }, { id: "asc" }]
    : [{ commissionValue: "desc" }, { createdAt: "desc" }, { id: "asc" }];
  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where, orderBy, skip, take,
      select: {
        id: true, name: true, desc: true, category: true, price: true,
        commissionValue: true, imageUrls: true,
        _count: { select: { links: true } },
      },
    }),
    prisma.product.count({ where }),
  ]);
  return {
    total,
    hasMore: skip + products.length < total,
    products: products.map(({ _count, ...product }) => ({
      ...product,
      imageUrls: getRenderableProductImageUrls(product.imageUrls, 1),
      affiliateCount: _count.links,
    })),
  };
}
