import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sellerId, name, desc, price, commissionValue } = body as {
      sellerId: string;
      name: string;
      desc?: string | null;
      price: number;
      commissionValue?: number;
    };

    if (!sellerId || !name || typeof price !== "number") {
      return NextResponse.json(
        { error: "Faltan datos: sellerId, name, price (number)" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sellerId,
        name,
        desc: desc ?? null,
        price,
        commissionValue: commissionValue ?? 10, // 👈 usa el valor enviado o default
      },
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        sellerId: true,
        commissionValue: true, // 👈 corregido
      },
    });

    return NextResponse.json(product, { status: 201 });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: "Error creando producto" },
      { status: 500 }
    );
  }
}
