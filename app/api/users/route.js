export const runtime = "nodejs";

import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser, requireRole } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";

function isValidEmail(email) {
  if (typeof email !== "string") return false;
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function isValidRole(role) {
  return role === "ADMIN" || role === "AFFILIATE" || role === "SELLER";
}

function getAuthStatus(error) {
  const msg = error instanceof Error ? error.message : "ERROR";
  if (msg === "UNAUTHORIZED") return 401;
  if (msg === "FORBIDDEN") return 403;
  return null;
}

export async function POST(req) {
  try {
    const limit = rateLimit(req, {
      key: "users:post",
      limit: 20,
      windowMs: 60_000,
    });

    if (!limit.ok) {
      return NextResponse.json(
        { error: "Demasiados intentos" },
        { status: 429, headers: { "Retry-After": String(limit.retryAfter) } }
      );
    }

    const currentUser = await requireUser();
    requireRole(currentUser, ["ADMIN"]);

    const { email, role, password } = await req.json();
    const emailNorm = (email ?? "").trim().toLowerCase();

    if (typeof password !== "string" || password.length < 10) {
      return NextResponse.json(
        { error: "Password invalida (minimo 10)" },
        { status: 400 }
      );
    }

    if (!isValidEmail(emailNorm)) {
      return NextResponse.json({ error: "Email invalido" }, { status: 400 });
    }

    const roleNorm = role ?? "AFFILIATE";
    if (!isValidRole(roleNorm)) {
      return NextResponse.json(
        { error: "Role invalido. Usa SELLER, AFFILIATE o ADMIN" },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email: emailNorm, role: roleNorm, passwordHash },
      select: { id: true, email: true, role: true },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (e) {
    const authStatus = getAuthStatus(e);
    if (authStatus) {
      return NextResponse.json(
        { error: e instanceof Error ? e.message : "ERROR" },
        { status: authStatus }
      );
    }

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
    const role = searchParams.get("role");
    const isActiveParam = searchParams.get("isActive");
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
    const authStatus = getAuthStatus(e);
    const status = authStatus ?? 500;
    if (status === 500) console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "ERROR" },
      { status }
    );
  }
}
