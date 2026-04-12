export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Props = {
  params: Promise<{
    code: string;
  }>;
};

export async function GET(req: NextRequest, context: Props) {
  try {
    const { code } = await context.params;

    const link = await prisma.affiliateCampaignLink.findUnique({
      where: { code },
      select: {
        id: true,
        campaignId: true,
        campaign: {
          select: {
            isActive: true,
            startsAt: true,
            endsAt: true,
            slug: true,
            seller: {
              select: {
                storeSlug: true,
              },
            },
          },
        },
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }

    if (!link.campaign?.seller?.storeSlug || !link.campaign?.slug) {
      return NextResponse.json(
        { error: "La campaña no tiene una URL pública válida" },
        { status: 400 }
      );
    }

    if (!link.campaign.isActive) {
      return NextResponse.json(
        { error: "La campaña está inactiva" },
        { status: 400 }
      );
    }

    const now = new Date();
    const started =
      !link.campaign.startsAt || link.campaign.startsAt <= now;
    const notEnded =
      !link.campaign.endsAt || link.campaign.endsAt >= now;

    if (!started || !notEnded) {
      return NextResponse.json(
        { error: "La campaña no está vigente" },
        { status: 400 }
      );
    }

    const ua = req.headers.get("user-agent");
    const xff = req.headers.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0].trim() : null;

    const click = await prisma.campaignClick.create({
      data: {
        linkId: link.id,
        ip,
        userAgent: ua ?? null,
      },
      select: {
        id: true,
      },
    });

    const url = new URL(req.url);
    url.pathname = `/store/${link.campaign.seller.storeSlug}/campaign/${link.campaign.slug}`;
    url.searchParams.set("ref", code);

    const res = NextResponse.redirect(url, { status: 302 });

    const maxAge = 60 * 60 * 24 * 30;

    res.cookies.set({
      name: "aff_campaign_click_id",
      value: click.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    res.cookies.set({
      name: "aff_campaign_code",
      value: code,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });

    // limpiar cookies de producto
    res.cookies.set({
      name: "aff_click_id",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    res.cookies.set({
      name: "aff_code",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (error) {
    console.error("Error en ccl/[code]:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}