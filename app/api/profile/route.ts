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

function isValidPayoutMethod(value: string | null) {
  return value === null || ["BANK_TRANSFER", "MERCADO_PAGO", "MANUAL"].includes(value);
}

async function getUserIdFromSession() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return typeof userId === "string" ? userId : undefined;
}

export async function GET() {
  const userId = await getUserIdFromSession();

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
      payoutMethod: true,
      payoutHolderName: true,
      payoutDocumentType: true,
      payoutDocumentNumber: true,
      payoutEmail: true,
      payoutPhone: true,
      payoutCountry: true,
      payoutCurrency: true,
      bankName: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankAccountAlias: true,
      bankBranch: true,
      payoutNotes: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ user });
}

export async function POST(req: Request) {
  const userId = await getUserIdFromSession();

  if (!userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const name = clean(body.name);
  const lastName = clean(body.lastName);
  const timezone = clean(body.timezone);
  const image = clean(body.image);
  const usernameRaw = clean(body.username);

  const payoutMethod = clean(body.payoutMethod);
  const payoutHolderName = clean(body.payoutHolderName);
  const payoutDocumentType = clean(body.payoutDocumentType);
  const payoutDocumentNumber = clean(body.payoutDocumentNumber);
  const payoutEmail = clean(body.payoutEmail);
  const payoutPhone = clean(body.payoutPhone);
  const payoutCountry = clean(body.payoutCountry);
  const payoutCurrency = clean(body.payoutCurrency);
  const bankName = clean(body.bankName);
  const bankAccountType = clean(body.bankAccountType);
  const bankAccountNumber = clean(body.bankAccountNumber);
  const bankAccountAlias = clean(body.bankAccountAlias);
  const bankBranch = clean(body.bankBranch);
  const payoutNotes = clean(body.payoutNotes);

  if (name && name.length > 60) {
    return NextResponse.json({ error: "Nombre demasiado largo" }, { status: 400 });
  }
  if (lastName && lastName.length > 60) {
    return NextResponse.json({ error: "Apellido demasiado largo" }, { status: 400 });
  }
  if (timezone && timezone.length > 64) {
    return NextResponse.json({ error: "Timezone invalido" }, { status: 400 });
  }
  if (image && image.length > 500) {
    return NextResponse.json({ error: "URL de imagen invalida" }, { status: 400 });
  }
  if (!isValidPayoutMethod(payoutMethod)) {
    return NextResponse.json({ error: "Metodo de cobro invalido" }, { status: 400 });
  }

  let username: string | null = null;

  if (usernameRaw) {
    username = usernameRaw;

    if (!isValidUsername(username)) {
      return NextResponse.json(
        { error: "Username invalido (3-30, letras/numeros/._-)" },
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
      return NextResponse.json({ error: "Ese username ya esta en uso" }, { status: 409 });
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
      payoutMethod: payoutMethod as "BANK_TRANSFER" | "MERCADO_PAGO" | "MANUAL" | null,
      payoutHolderName,
      payoutDocumentType,
      payoutDocumentNumber,
      payoutEmail,
      payoutPhone,
      payoutCountry,
      payoutCurrency,
      bankName,
      bankAccountType,
      bankAccountNumber,
      bankAccountAlias,
      bankBranch,
      payoutNotes,
    },
    select: {
      email: true,
      name: true,
      lastName: true,
      username: true,
      timezone: true,
      image: true,
      payoutMethod: true,
      payoutHolderName: true,
      payoutDocumentType: true,
      payoutDocumentNumber: true,
      payoutEmail: true,
      payoutPhone: true,
      payoutCountry: true,
      payoutCurrency: true,
      bankName: true,
      bankAccountType: true,
      bankAccountNumber: true,
      bankAccountAlias: true,
      bankBranch: true,
      payoutNotes: true,
      updatedAt: true,
    },
  });

  return NextResponse.json({ ok: true, user: updatedUser });
}
