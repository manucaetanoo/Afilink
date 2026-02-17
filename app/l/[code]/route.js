export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// DETECTA CUANDO UN USUARIO ENTRA AL LINK DE AFILIADO (REGISTRO DE CLICKS)

export async function GET(req, context) {
  try {
    const { code } = await context.params;

    const link = await prisma.affiliateLink.findUnique({
      where: { code },
      select: {
        id: true,
        productId: true,
      },
    });

    if (!link) {
      return NextResponse.json({ error: "Link inválido" }, { status: 404 });
    }



    //contiene el User-Agent del cliente.
    const ua = req.headers.get("user-agent");
    //contiene el valor completo del header X-Forwarded-For (posibles IPs).
    const xff = req.headers.get("x-forwarded-for");
    //se queda con la primera IP de esa lista, o null si el header no estaba presente.
    const ip = xff ? xff.split(",")[0].trim() : null;

    const click = await prisma.click.create({
      data: {
        linkId: link.id,
        ip,
        userAgent: ua ?? null,
      },
      select: { id: true },
    });

    // Redirigir a página interna del producto (ideal para atribuir conversión luego)
    const url = new URL(req.url);
    url.pathname = `/products/${link.productId}`;
    url.searchParams.set("ref", code);

    const res =  NextResponse.redirect(url, { status: 302 });
    const maxAge = 60 * 60 * 24 * 30;

  res.cookies.set({
  name: "aff_click_id",
  value: click.id,
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax",
  path: "/",
  maxAge,
});

    res.cookies.set({
      name: "aff_code",
      value: code,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge,
    });


   return res;
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }




}
