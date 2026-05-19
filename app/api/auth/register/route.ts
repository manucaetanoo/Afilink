import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role } from "@/lib/prisma-enums";
import { sendEmailVerification } from "@/lib/email-verification";


export async function POST(req: Request) {
  const body = await req.json();

  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const name = body.name ? String(body.name).trim() : null;
  const allowedRoles: Role[] = [Role.SELLER, Role.AFFILIATE];
  const role =
    body.role && allowedRoles.includes(body.role.toUpperCase() as Role)
      ? (body.role.toUpperCase() as Role)
      : Role.SELLER;


  if (!email || !password) {
    return NextResponse.json(
      { error: "Email y password son obligatorios" },
      { status: 400 }
    );
  }


  if (password.length < 6) {
    return NextResponse.json(
      { error: "Password muy corto (mínimo 6)" },
      { status: 400 }
    );
  }

  const exists = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      emailVerifiedAt: true,
    },
  });
  if (exists) {
    if (!exists.emailVerifiedAt) {
      await sendEmailVerification({ req, user: exists });
      return NextResponse.json({
        message: "La cuenta ya existia. Te reenviamos el email de verificacion.",
        email: exists.email,
        role: exists.role,
      });
    }

    return NextResponse.json({ error: "Ese email ya existe" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      role,
      isActive: true,
      emailVerifiedAt: null,
    },
    select: { id: true, email: true, name:true, role: true, isActive: true },
  });

  await sendEmailVerification({ req, user });

  return NextResponse.json(
    {
      message: "Cuenta creada. Te enviamos un email para verificar tu cuenta.",
      email: user.email,
      role: user.role,
    },
    { status: 201 }
  );
}
