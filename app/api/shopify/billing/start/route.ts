import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createShopifyUsageBillingApproval } from "@/lib/shopify-billing";
import { isShopifyBillingEnabled } from "@/lib/features";

export async function POST() {
  try {
    if (!isShopifyBillingEnabled()) {
      return NextResponse.json(
        { ok: false, error: "Shopify Billing deshabilitado" },
        { status: 404 }
      );
    }

    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const connection = await prisma.shopifyConnection.findUnique({
      where: { userId: user.id },
      select: { shopDomain: true },
    });

    if (!connection) {
      return NextResponse.json(
        { ok: false, error: "Conecta Shopify antes de activar billing" },
        { status: 400 }
      );
    }

    const confirmationUrl = await createShopifyUsageBillingApproval({
      shopDomain: connection.shopDomain,
    });

    return NextResponse.json({
      ok: true,
      confirmationUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo activar billing";
    const status =
      message === "UNAUTHORIZED" ? 401 : message === "Debes tener rol de vendedor" ? 403 : 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
