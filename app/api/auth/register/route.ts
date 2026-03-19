import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {Role} from "@prisma/client";


export async function POST(req: Request) {
  const body = await req.json();

  const email = String(body.email || "").toLowerCase().trim();
  const password = String(body.password || "");
  const name = body.name ? String(body.name).trim() : null;
  const role = body.role && Object.values(Role).includes(body.role.toUpperCase() as Role)
    ? (body.role.toUpperCase() as Role)
    : Role.SELLER; // default válido


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

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) {
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
    },
    select: { id: true, email: true, name:true, role: true, isActive: true },
  });

  return NextResponse.json(user, { status: 201 });
}
