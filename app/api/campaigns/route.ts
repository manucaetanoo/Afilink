import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const fallbackImage =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";
const MAX_CAMPAIGNS_TAKE = 30;

function getPaginationValue(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return fallback;
  return Math.min(parsed, max);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const skip = getPaginationValue(url.searchParams.get("skip"), 0, 10_000);
  const take = getPaginationValue(url.searchParams.get("take"), 12, MAX_CAMPAIGNS_TAKE);
  const now = new Date();

  const campaigns = await prisma.campaign.findMany({
    where: {
      isActive: true,
      OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: take + 1,
    select: {
      id: true,
      title: true,
      slug: true,
      description: true,
      createdAt: true,
      bannerUrl: true,
      seller: {
        select: {
          name: true,
          storeSlug: true,
          image: true,
        },
      },
      products: {
        select: {
          product: {
            select: {
              price: true,
              isActive: true,
              commissionValue: true,
              imageUrls: true,
            },
          },
        },
      },
    },
  });

  const items = campaigns.slice(0, take).map((campaign) => {
    const activeProducts = campaign.products
      .map((item) => item.product)
      .filter((product) => product?.isActive);
    const mainImage =
      campaign.bannerUrl ||
      activeProducts.find((product) => product.imageUrls?.[0])?.imageUrls?.[0] ||
      fallbackImage;
    const maxCommissionPercent = activeProducts.length
      ? Math.max(...activeProducts.map((product) => product.commissionValue || 0))
      : 0;
    const maxEarning = activeProducts.length
      ? Math.max(
          ...activeProducts.map((product) => {
            return (Number(product.price || 0) * Number(product.commissionValue || 0)) / 100;
          })
        )
      : 0;
    const minPrice = activeProducts.length
      ? Math.min(...activeProducts.map((product) => Number(product.price || 0)))
      : 0;

    return {
      id: campaign.id,
      title: campaign.title,
      slug: campaign.slug,
      description: campaign.description,
      createdAtMs: campaign.createdAt.getTime(),
      seller: campaign.seller,
      activeProductsCount: activeProducts.length,
      mainImage,
      maxCommissionPercent,
      maxEarning,
      minPrice,
    };
  });

  return NextResponse.json({
    ok: true,
    hasMore: campaigns.length > take,
    campaigns: items.filter((campaign) => campaign.activeProductsCount > 0),
  });
}
