import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const connection = await prisma.shopifyConnection.findUnique({
      where: { userId: user.id },
      select: {
        shopDomain: true,
        scope: true,
        installedAt: true,
        updatedAt: true,
      },
    });

    return NextResponse.json({ ok: true, connection });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}

export async function DELETE() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    await prisma.shopifyConnection.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
