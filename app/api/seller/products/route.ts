import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";


//Endpoint para obtener la lista de productos visibles según el rol del usuario.



export async function GET() {
  try {
    const user = await requireUser();              // obtiene el usuario actual
    requireRole(user, ["SELLER", "ADMIN"]);        // valida que sea SELLER o ADMIN

    const products = await prisma.product.findMany({
      where: user.role === "ADMIN" ? {} : { sellerId: user.id }, // si es ADMIN ve todos, si es SELLER solo los suyos
      orderBy: { createdAt: "desc" },                            // ordena por fecha de creación
      select: { 
        id: true, 
        name: true, 
        desc: true, 
        price: true, 
        createdAt: true, 
        isActive: true,
        commissionValue: true,
        commissionType: true, 
        imageUrls: true

      }, // selecciona campos
    });

    return NextResponse.json({ ok: true, products }); // devuelve lista de productos
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 500;
    return NextResponse.json({ ok: false, error: msg }, { status }); // maneja errores
  }
}


export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json();

    const name = String(body.name ?? "").trim();
    const desc = String(body.desc ?? "").trim();
    const price = Number(body.price);
    const commissionValue = Number(body.commissionValue);
    const commissionType = body.commissionType as "PERCENT" | "FIXED";

    // ✅ imageUrls debe ser string[]
    const imageUrlsRaw = body.imageUrls;
    const imageUrls: string[] = Array.isArray(imageUrlsRaw)
      ? imageUrlsRaw
          .filter((u: any) => typeof u === "string")
          .map((u: string) => u.trim())
          .filter((u: string) => u.length > 0)
      : [];

    // Validaciones básicas
    if (name.length < 3)
      return NextResponse.json({ ok: false, error: "Nombre muy corto" }, { status: 400 });

    // ⚠️ OJO: si querés permitir decimales, no uses Number.isInteger
    if (!Number.isFinite(price) || price <= 0) {
      return NextResponse.json({ ok: false, error: "Precio inválido" }, { status: 400 });
    }

    if (!Number.isFinite(commissionValue) || commissionValue <= 0) {
      return NextResponse.json({ ok: false, error: "Comisión inválida" }, { status: 400 });
    }

    if (!["PERCENT", "FIXED"].includes(commissionType)) {
      return NextResponse.json({ ok: false, error: "Tipo de comisión inválido" }, { status: 400 });
    }

    const created = await prisma.product.create({
      data: {
        sellerId: user.id,
        name,
        desc: desc.length ? desc : null,
        price,
        commissionValue,
        commissionType,
        imageUrls, // ✅ SIEMPRE array
      },
      select: { id: true, commissionValue: true, commissionType: true },
    });

    return NextResponse.json({ ok: true, id: created.id }, { status: 201 });
  } catch (e: any) {
    const msg = e?.message || "ERROR";
    const status =
      msg === "UNAUTHORIZED" ? 401 : msg === "Debes tener rol de vendedor" ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}


