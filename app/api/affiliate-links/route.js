export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

function genCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req) {
  try {
    const limit = rateLimit(req, {
      key: "affiliate-links:post",
      limit: 30,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const currentUser = await requireUser();
    const { productId, affiliateId } = await req.json();
    const resolvedAffiliateId =
      currentUser.role === "ADMIN" && typeof affiliateId === "string"
        ? affiliateId
        : currentUser.id;

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }

    if (
      currentUser.role !== "ADMIN" &&
      affiliateId &&
      affiliateId !== currentUser.id
    ) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const origin = new URL(req.url).origin;
    const [product, affiliate] = await Promise.all([
      prisma.product.findUnique({
        where: { id: productId },
        select: { id: true, isActive: true, sellerId: true },
      }),
      prisma.user.findUnique({
        where: { id: resolvedAffiliateId },
        select: { id: true, role: true, isActive: true },
      }),
    ]);

    if (!product || !product.isActive) {
      return NextResponse.json({ error: "Producto no existe" }, { status: 404 });
    }

    if (!affiliate || !affiliate.isActive) {
      return NextResponse.json(
        { error: "Afiliado no existe o esta inactivo" },
        { status: 404 }
      );
    }

    if (affiliate.role !== "AFFILIATE" && affiliate.role !== "ADMIN") {
      return NextResponse.json(
        { error: "El usuario no tiene rol de afiliado" },
        { status: 403 }
      );
    }

    if (product.sellerId === resolvedAffiliateId) {
      return NextResponse.json(
        { error: "No podes afiliar tu propio producto" },
        { status: 403 }
      );
    }

    const existing = await prisma.affiliateLink.findUnique({
      where: {
        productId_affiliateId: {
          productId,
          affiliateId: resolvedAffiliateId,
        },
      },
      select: { code: true },
    });

    if (existing) {
      return NextResponse.json(
        { code: existing.code, url: `${origin}/l/${existing.code}` },
        { status: 200 }
      );
    }

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode(7);

      try {
        const link = await prisma.affiliateLink.create({
          data: { code, productId, affiliateId: resolvedAffiliateId },
          select: { code: true },
        });

        return NextResponse.json(
          { code: link.code, url: `${origin}/l/${link.code}` },
          { status: 201 }
        );
      } catch (e) {
        if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
          const again = await prisma.affiliateLink.findUnique({
            where: {
              productId_affiliateId: {
                productId,
                affiliateId: resolvedAffiliateId,
              },
            },
            select: { code: true },
          });

          if (again) {
            return NextResponse.json(
              { code: again.code, url: `${origin}/l/${again.code}` },
              { status: 200 }
            );
          }

          continue;
        }

        throw e;
      }
    }

    return NextResponse.json({ error: "No se pudo generar un code unico" }, { status: 500 });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    if (msg === "UNAUTHORIZED") {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
