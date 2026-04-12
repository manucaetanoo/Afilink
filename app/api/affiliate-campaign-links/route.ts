export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function genCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req: NextRequest) {
  try {
    const { campaignId, affiliateId } = await req.json();

    if (!campaignId || typeof campaignId !== "string") {
      return NextResponse.json({ error: "campaignId requerido" }, { status: 400 });
    }

    if (!affiliateId || typeof affiliateId !== "string") {
      return NextResponse.json({ error: "affiliateId requerido" }, { status: 400 });
    }
    

    const origin = new URL(req.url).origin;

    // Verificar campaña y afiliado
    const [campaign, affiliate] = await Promise.all([
      prisma.campaign.findUnique({
        where: { id: campaignId },
        select: {
          id: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
        },
      }),
      
      prisma.user.findUnique({
        where: { id: affiliateId },
        select: { id: true, role: true, isActive: true },
      }),
    ]);

    console.log("affiliate:", affiliateId);
    console.log("affiliate desde la db: ",affiliate )

    if (!campaign) {
      return NextResponse.json({ error: "Campaña no existe" }, { status: 404 });
    }

    if (!campaign.isActive) {
      return NextResponse.json({ error: "La campaña está inactiva" }, { status: 400 });
    }

    const now = new Date();

    if (campaign.startsAt && campaign.startsAt > now) {
      return NextResponse.json(
        { error: "La campaña todavía no comenzó" },
        { status: 400 }
      );
    }

    if (campaign.endsAt && campaign.endsAt < now) {
      return NextResponse.json(
        { error: "La campaña ya finalizó" },
        { status: 400 }
      );
    }

    if (!affiliate || !affiliate.isActive) {
      return NextResponse.json(
        { error: "Afiliado no existe o está inactivo" },
        { status: 404 }
      );
    }

    if (affiliate.role !== "AFFILIATE" && affiliate.role !== "ADMIN") {
      return NextResponse.json(
        { error: "El usuario no tiene rol de afiliado" },
        { status: 403 }
      );
    }

    // Si ya existe link para (campaignId, affiliateId), devolverlo
    const existing = await prisma.affiliateCampaignLink.findUnique({
      where: {
        campaignId_affiliateId: {
          campaignId,
          affiliateId,
        },
      },
      select: { code: true },
    });

    if (existing) {
      return NextResponse.json(
        { code: existing.code, url: `${origin}/cl/${existing.code}` },
        { status: 200 }
      );
    }

    // Crear con code único
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode(7);

      try {
        const link = await prisma.affiliateCampaignLink.create({
          data: {
            code,
            campaignId,
            affiliateId,
          },
          select: { code: true },
        });

        return NextResponse.json(
          { code: link.code, url: `${origin}/cl/${link.code}` },
          { status: 201 }
        );
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002") {
            const again = await prisma.affiliateCampaignLink.findUnique({
              where: {
                campaignId_affiliateId: {
                  campaignId,
                  affiliateId,
                },
              },
              select: { code: true },
            });

            if (again) {
              return NextResponse.json(
                { code: again.code, url: `${origin}/cl/${again.code}` },
                { status: 200 }
              );
            }

            continue;
          }
        }

        throw e;
      }
    }

    return NextResponse.json(
      { error: "No se pudo generar un code único" },
      { status: 500 }
    );
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}