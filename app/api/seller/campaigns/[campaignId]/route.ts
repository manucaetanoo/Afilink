import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

type Context = {
  params: Promise<{ campaignId: string }>;
};

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

// GET una campaña
export async function GET(_: Request, context: Context) {
  const { campaignId } = await context.params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const campaign = await prisma.campaign.findFirst({
    where: {
      id: campaignId,
      sellerId: session.user.id,
    },
  });

  if (!campaign) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json({ campaign });
}

// PATCH editar
export async function PATCH(req: Request, context: Context) {
  const { campaignId } = await context.params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();

  const title = body?.title?.trim();
  let slug = body?.slug?.trim();

  if (!title) {
    return NextResponse.json({ error: "Título requerido" }, { status: 400 });
  }

  slug = slug ? slugify(slug) : slugify(title);

  const existing = await prisma.campaign.findFirst({
    where: {
      sellerId: session.user.id,
      slug,
      NOT: { id: campaignId },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Slug ya en uso" },
      { status: 409 }
    );
  }

  const campaign = await prisma.campaign.update({
    where: { id: campaignId },
    data: {
      title,
      slug,
      description: body?.description || null,
      bannerUrl: body?.bannerUrl || null,
      isActive: body?.isActive ?? true,
      startsAt: body?.startsAt ? new Date(body.startsAt) : null,
      endsAt: body?.endsAt ? new Date(body.endsAt) : null,
    },
  });

  return NextResponse.json({ campaign });
}

// DELETE campaña
export async function DELETE(_: Request, context: Context) {
  const { campaignId } = await context.params;

  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  await prisma.campaign.delete({
    where: {
      id: campaignId,
    },
  });

  return NextResponse.json({ ok: true });
}