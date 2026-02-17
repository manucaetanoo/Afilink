import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function clean(value: unknown) {
  if (typeof value !== "string") return null;
  const v = value.trim();
  return v.length ? v : null;
}

function isValidUsername(u: string) {
  return /^[a-zA-Z0-9._-]{3,30}$/.test(u);
}

export async function GET() {
  const session = await getServerSession(authOptions);

  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      email: true,
      name: true,
      lastName: true,
      username: true,
      timezone: true,
      image: true,
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

  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const name = clean(body.name);
  const lastName = clean(body.lastName);
  const timezone = clean(body.timezone);
  const image = clean(body.image);
  const usernameRaw = clean(body.username);

  if (name && name.length > 60) {
    return NextResponse.json({ error: "Nombre demasiado largo" }, { status: 400 });
  }
  if (lastName && lastName.length > 60) {
    return NextResponse.json({ error: "Apellido demasiado largo" }, { status: 400 });
  }
  if (timezone && timezone.length > 64) {
    return NextResponse.json({ error: "Timezone inválido" }, { status: 400 });
  }
  if (image && image.length > 500) {
    return NextResponse.json({ error: "URL de imagen inválida" }, { status: 400 });
  }

  let username: string | null = null;

  if (usernameRaw) {
    username = usernameRaw;

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Username inválido (3-30, letras/números/._-)" },
        { status: 400 }
      );
    }

    const exists = await prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
      select: { id: true },
    });

    if (exists) {
      return NextResponse.json({ error: "Ese username ya está en uso" }, { status: 409 });
    }
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name,
      lastName,
      username,
      timezone,
      image,
    },
    select: {
      email: true,
      name: true,
      lastName: true,
      username: true,
      timezone: true,
      image: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, user: updatedUser });
}
