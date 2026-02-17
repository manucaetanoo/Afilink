export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function genCode(len = 7) {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

export async function POST(req) {
  try {
    const { productId, affiliateId } = await req.json();

    if (!productId || typeof productId !== "string") {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }
    if (!affiliateId || typeof affiliateId !== "string") {
      return NextResponse.json({ error: "affiliateId requerido" }, { status: 400 });
    }
     const origin = new URL(req.url).origin;

    // Verificar que existan y estén activos
    const [product, affiliate] = await Promise.all([
      prisma.product.findUnique({ where: { id: productId }, select: { id: true } }),
      prisma.user.findUnique({
        where: { id: affiliateId },
        select: { id: true, role: true, isActive: true },
      }),
    ]);

    if (!product) {
      return NextResponse.json({ error: "Producto no existe" }, { status: 404 });
    }
    if (!affiliate || !affiliate.isActive) {
      return NextResponse.json({ error: "Afiliado no existe o está inactivo" }, { status: 404 });
    }
    if (affiliate.role !== "AFFILIATE" && affiliate.role !== "ADMIN") {
      return NextResponse.json(
        { error: "El usuario no tiene rol de afiliado" },
        { status: 403 }
      );
    }

    // Si ya existe link para (productId, affiliateId), devolvelo
    const existing = await prisma.affiliateLink.findUnique({
      where: { productId_affiliateId: { productId, affiliateId } },
      select: { code: true },
    });

    if (existing) {
      return NextResponse.json(
        { code: existing.code, url: `${origin}/l/${existing.code}` },
        { status: 200 }
);
    }

    // Crear con code único (reintentos si colisiona)
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = genCode(7);
      try {
        const link = await prisma.affiliateLink.create({
          data: { code, productId, affiliateId },
          select: { code: true },
        });

        return NextResponse.json(
  { code: link.code, url: `${origin}/l/${link.code}` },
  { status: 201 }
        );
      } catch (e) {
        // Si colisiona code único o unique(productId, affiliateId), reintentar o devolver existente
        if (e instanceof Prisma.PrismaClientKnownRequestError) {
          if (e.code === "P2002") {
            // Puede ser code duplicado o la unique compuesta (si justo lo crearon en paralelo)
            // Intentamos leer el existente si es por la compuesta
            const again = await prisma.affiliateLink.findUnique({
              where: { productId_affiliateId: { productId, affiliateId } },
              select: { code: true },
            });
            if (again) {
              return NextResponse.json(
  { code: again.code, url: `${origin}/l/${again.code}` },
  { status: 200 }
              );
            }
            // si fue code duplicado, seguimos reintentando
            continue;
          }
        }
        throw e;
      }
    }

    return NextResponse.json({ error: "No se pudo generar un code único" }, { status: 500 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
