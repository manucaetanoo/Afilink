import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const productId = String(body?.productId || "");

  if (!productId) {
    return NextResponse.json({ clickId: null, campaignClickId: null });
  }

  const cookieStore = await cookies();
  const clickId = cookieStore.get("aff_click_id")?.value;
  const campaignClickId = cookieStore.get("aff_campaign_click_id")?.value;

  if (clickId) {
    const click = await prisma.click.findUnique({
      where: { id: clickId },
      select: {
        id: true,
        link: { select: { productId: true } },
      },
    });

    if (click?.link.productId === productId) {
      return NextResponse.json({ clickId: click.id, campaignClickId: null });
    }
  }

  if (campaignClickId) {
    const campaignClick = await prisma.campaignClick.findUnique({
      where: { id: campaignClickId },
      select: {
        id: true,
        link: {
          select: {
            campaignId: true,
            campaign: {
              select: {
                isActive: true,
                startsAt: true,
                endsAt: true,
                products: {
                  where: { productId },
                  select: { productId: true },
                },
              },
            },
          },
        },
      },
    });

    const campaign = campaignClick?.link.campaign;
    const now = new Date();
    const started = !campaign?.startsAt || campaign.startsAt <= now;
    const notEnded = !campaign?.endsAt || campaign.endsAt >= now;

    if (
      campaignClick &&
      campaign?.isActive &&
      started &&
      notEnded &&
      campaign.products.length > 0
    ) {
      return NextResponse.json({
        clickId: null,
        campaignClickId: campaignClick.id,
      });
    }
  }

  return NextResponse.json({ clickId: null, campaignClickId: null });
}
