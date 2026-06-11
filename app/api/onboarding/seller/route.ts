import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function getSessionUserId(session: unknown) {
  if (!session || typeof session !== "object" || !("user" in session)) return undefined;

  const { user } = session as { user?: { id?: unknown } };
  return typeof user?.id === "string" ? user.id : undefined;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      image: true,
      storeSlug: true,
      role: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  const userId = getSessionUserId(session);

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: userId },
    select: { storeSlug: true, role: true },
  });

  if (!currentUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (currentUser.role !== "SELLER") {
    return NextResponse.json(
      { error: "Solo los vendedores pueden configurar una tienda" },
      { status: 403 }
    );
  }

  if (currentUser.storeSlug) {
    return NextResponse.json(
      { error: "La cuenta ya fue configurada" },
      { status: 409 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const companyName = clean(body.companyName);
  const slug = clean(body.storeSlug);
  const image = clean(body.image);

  if (!companyName) {
    return NextResponse.json(
      { error: "El nombre de la empresa es obligatorio" },
      { status: 400 }
    );
  }

  if (!slug) {
    return NextResponse.json(
      { error: "El slug es obligatorio" },
      { status: 400 }
    );
  }

  if (slug.length > 60) {
    return NextResponse.json({ error: "Slug demasiado largo" }, { status: 400 });
  }

  if (image && image.length > 500) {
    return NextResponse.json({ error: "URL de imagen invalida" }, { status: 400 });
  }

  const exists = await prisma.user.findFirst({
    where: {
      storeSlug: slug,
      NOT: { id: userId },
    },
    select: { id: true },
  });

  if (exists) {
    return NextResponse.json(
      { error: "Ese slug ya esta en uso" },
      { status: 409 }
    );
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: companyName,
      storeSlug: slug,
      ...(image ? { image } : {}),
    },
    select: {
      id: true,
      email: true,
      name: true,
      image: true,
      storeSlug: true,
      role: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, user: updatedUser });
}
