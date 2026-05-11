import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "SELLER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const campaigns = await prisma.campaign.findMany({
      where: {
        sellerId: session.user.id,
      },
      include: {
        products: {
          include: {
            product: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ campaigns });
  } catch (error) {
    console.error("GET /api/seller/campaigns error:", error);
    return NextResponse.json(
      { error: "Error obteniendo campañas" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    if (session.user.role !== "SELLER") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const body = await req.json();

    const title = body?.title?.trim();
    const description = body?.description?.trim() || null;
    const bannerUrl = body?.bannerUrl?.trim() || null;
    const isActive = typeof body?.isActive === "boolean" ? body.isActive : true;

    let slug = body?.slug?.trim();
    slug = slug ? slugify(slug) : slugify(title || "");

    const startsAt = body?.startsAt ? new Date(body.startsAt) : null;
    const endsAt = body?.endsAt ? new Date(body.endsAt) : null;

    if (!title) {
      return NextResponse.json(
        { error: "El título es obligatorio" },
        { status: 400 }
      );
    }

    if (!slug) {
      return NextResponse.json(
        { error: "No se pudo generar el slug" },
        { status: 400 }
      );
    }

    if (startsAt && isNaN(startsAt.getTime())) {
      return NextResponse.json(
        { error: "Fecha de inicio inválida" },
        { status: 400 }
      );
    }

    if (endsAt && isNaN(endsAt.getTime())) {
      return NextResponse.json(
        { error: "Fecha de fin inválida" },
        { status: 400 }
      );
    }

    if (startsAt && endsAt && startsAt > endsAt) {
      return NextResponse.json(
        { error: "La fecha de inicio no puede ser mayor que la fecha de fin" },
        { status: 400 }
      );
    }

    const existing = await prisma.campaign.findFirst({
      where: {
        sellerId: session.user.id,
        slug,
      },
      select: { id: true },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Ya existe una campaña con ese slug" },
        { status: 409 }
      );
    }

    const campaign = await prisma.campaign.create({
      data: {
        title,
        slug,
        description,
        bannerUrl,
        isActive,
        startsAt,
        endsAt,
        sellerId: session.user.id,
      },
    });

    revalidateTag("campaigns");
    revalidateTag("stores");
    revalidatePath("/campaigns");
    revalidatePath("/store");

    return NextResponse.json({ campaign }, { status: 201 });
  } catch (error) {
    console.error("POST /api/seller/campaigns error:", error);
    return NextResponse.json(
      { error: "Error creando campaña" },
      { status: 500 }
    );
  }
}
