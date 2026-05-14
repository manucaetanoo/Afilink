export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidRole(role) {
  return role === "ADMIN" || role === "AFFILIATE" || role  === "SELLER";
}



export async function POST(req) {
  try {
    const { email, role, password } = await req.json();

    const emailNorm = (email ?? "").trim().toLowerCase();

    const passwordHash = await bcrypt.hash(password, 10);


    if(typeof password !== "string" || password.length < 6 ){
      return NextResponse.json({error: "Password Invalida (minimo 6)"}, {status: 400});
    }

    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: "Email inválido" }, { status: 400 });
    }

    const roleNorm = role ?? "AFFILIATE";
    if (roleNorm === "ADMIN") {
      return NextResponse.json(
        { error: "No podés asignarte el rol ADMIN" },
        { status: 403 }
      );
    }
    if (!isValidRole(roleNorm)) {
      return NextResponse.json(
        { error: "Role inválido. Usá SELLER o AFFILIATE" },
        { status: 400 }
      );
    }

    const user = await prisma.user.create({
      data: { email: emailNorm, role: roleNorm, passwordHash  }, // <- ACÁ usás emailNorm
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "Ya existe un usuario con ese email" },
        { status: 409 }
      );
    }
    console.error(e);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}


export async function GET(req) {
  try {
    const user = await requireUser();
    requireRole(user, ["ADMIN"]);

    const { searchParams } = new URL(req.url);

    const q = (searchParams.get("q") ?? "").trim().toLowerCase();
    const role = searchParams.get("role"); // "ADMIN" | "AFFILIATE" | null
    const isActiveParam = searchParams.get("isActive"); // "true" | "false" | null

    const page = Math.max(parseInt(searchParams.get("page") ?? "1", 10), 1);
    const pageSizeRaw = parseInt(searchParams.get("pageSize") ?? "20", 10);
    const pageSize = Math.min(Math.max(pageSizeRaw, 1), 100);

    const where = {
      ...(q ? { email: { contains: q, mode: "insensitive" } } : {}),
      ...(role ? { role } : {}),
      ...(isActiveParam === "true" ? { isActive: true } : {}),
      ...(isActiveParam === "false" ? { isActive: false } : {}),
    };

    const users = await prisma.user.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json(
      { page, pageSize, count: users.length, users },
      { status: 200 }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "ERROR";
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 500;
    if (status === 500) console.error(e);
    return NextResponse.json({ error: msg }, { status });
  }
}