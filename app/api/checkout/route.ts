import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const productId: string | undefined = body?.productId;

    if (!productId) {
      return NextResponse.json({ error: "productId requerido" }, { status: 400 });
    }

    const cookieStore = await cookies();
    // 1) Leer cookie de atribución
    const clickId = cookieStore.get("aff_click_id")?.value ?? null;

    // 2) Traer precio real del producto (no confiar en el cliente)
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, price: true },
    });

    if (!product) {
      return NextResponse.json({ error: "Producto no existe" }, { status: 404 });
    }

    // 3) Crear order (1 producto = 1 order en tu MVP)
    const order = await prisma.order.create({
      data: {
        productId: product.id,
        total: product.price,
        clickId: clickId ?? undefined, // ✅ atribución
        // status: "PENDING", // si agregaste OrderStatus
      },
      select: { id: true, total: true, createdAt: true },
    });

    return NextResponse.json({ ok: true, order }, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
