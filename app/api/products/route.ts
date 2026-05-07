import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { sellerId, name, desc, price, stock, commissionValue } = body as {
      sellerId: string;
      name: string;
      desc?: string | null;
      price: number;
      stock?: number;
      commissionValue?: number;
    };

    if (!sellerId || !name || typeof price !== "number") {
      return NextResponse.json(
        { error: "Faltan datos: sellerId, name, price (number)" },
        { status: 400 }
      );
    }

    if (
      stock !== undefined &&
      (!Number.isInteger(stock) || stock < 0)
    ) {
      return NextResponse.json(
        { error: "Stock invalido" },
        { status: 400 }
      );
    }

    if (
      commissionValue !== undefined &&
      (!Number.isFinite(commissionValue) || commissionValue <= 0 || commissionValue > 100)
    ) {
      return NextResponse.json(
        { error: "Comision invalida" },
        { status: 400 }
      );
    }

    const product = await prisma.product.create({
      data: {
        sellerId,
        name,
        desc: desc ?? null,
        price,
        stock: stock ?? 0,
        commissionValue: commissionValue ?? 10,
        commissionType: "PERCENT",
      },
      select: {
        id: true,
        name: true,
        desc: true,
        price: true,
        stock: true,
        sellerId: true,
        commissionValue: true, 
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
