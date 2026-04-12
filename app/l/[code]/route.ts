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

    const ua = req.headers.get("user-agent");
    const xff = req.headers.get("x-forwarded-for");
    const ip = xff ? xff.split(",")[0].trim() : null;

    const click = await prisma.click.create({
      data: {
        linkId: link.id,
        ip,
        userAgent: ua ?? null,
      },
      select: { id: true },
    });

    const url = new URL(req.url);
    url.pathname = `/products/${link.productId}`;
    url.searchParams.set("ref", code);

    const res = NextResponse.redirect(url, { status: 302 });
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

    // limpiar cookies de campaña
    res.cookies.set({
      name: "aff_campaign_click_id",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    res.cookies.set({
      name: "aff_campaign_code",
      value: "",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (e) {
    console.error("Error en l/[code]:", e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}