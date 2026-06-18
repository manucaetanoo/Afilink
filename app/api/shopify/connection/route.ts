import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decryptShopifyToken, SHOPIFY_API_VERSION } from "@/lib/shopify";
import { isShopifyEnabledForEmail } from "@/lib/features";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

async function isShopifyConnectionActive({
  shopDomain,
  accessToken,
}: {
  shopDomain: string;
  accessToken: string;
}) {
  try {
    const response = await fetch(
      `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`,
      {
        headers: {
          "X-Shopify-Access-Token": decryptShopifyToken(accessToken),
          "Content-Type": "application/json",
        },
        cache: "no-store",
      }
    );

    if (response.status === 401 || response.status === 403) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Shopify connection validation failed", error);
    return true;
  }
}

export async function GET() {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    if (!isShopifyEnabledForEmail(user.email)) {
      return NextResponse.json({ ok: true, connection: null });
    }

    const connection = await prisma.shopifyConnection.findUnique({
      where: { userId: user.id },
      select: {
        shopDomain: true,
        accessToken: true,
        scope: true,
        installedAt: true,
        updatedAt: true,
      },
    });

    if (!connection) {
      return NextResponse.json({ ok: true, connection: null });
    }

    const active = await isShopifyConnectionActive({
      shopDomain: connection.shopDomain,
      accessToken: connection.accessToken,
    });

    if (!active) {
      await prisma.shopifyConnection.deleteMany({ where: { userId: user.id } });
      return NextResponse.json({ ok: true, connection: null });
    }

    return NextResponse.json({
      ok: true,
      connection: {
        shopDomain: connection.shopDomain,
        scope: connection.scope,
        installedAt: connection.installedAt,
        updatedAt: connection.updatedAt,
      },
    });
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

    if (!isShopifyEnabledForEmail(user.email)) {
      return NextResponse.json(
        { ok: false, error: "Shopify no esta habilitado para esta cuenta" },
        { status: 404 }
      );
    }

    await prisma.shopifyConnection.deleteMany({ where: { userId: user.id } });
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
