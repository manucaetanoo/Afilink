import { NextResponse } from "next/server";
import { requireRole, requireUser } from "@/lib/auth";
import {
  createShopifyState,
  getAppUrl,
  getShopifyClientId,
  normalizeShopDomain,
  SHOPIFY_SCOPES,
} from "@/lib/shopify";

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "ERROR";
}

export async function POST(req: Request) {
  try {
    const user = await requireUser();
    requireRole(user, ["SELLER", "ADMIN"]);

    const body = await req.json().catch(() => ({}));
    const shop = normalizeShopDomain(body.shopDomain);

    if (!shop) {
      return NextResponse.json(
        { ok: false, error: "Dominio de Shopify invalido" },
        { status: 400 }
      );
    }

    const redirectUri = `${getAppUrl()}/api/shopify/oauth/callback`;
    const url = new URL(`https://${shop}/admin/oauth/authorize`);
    url.searchParams.set("client_id", getShopifyClientId());
    url.searchParams.set("scope", SHOPIFY_SCOPES);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("state", createShopifyState(user.id, shop));

    return NextResponse.json({ ok: true, authUrl: url.toString() });
  } catch (e: unknown) {
    const msg = getErrorMessage(e);
    const status = msg === "UNAUTHORIZED" ? 401 : msg === "FORBIDDEN" ? 403 : 400;
    return NextResponse.json({ ok: false, error: msg }, { status });
  }
}
