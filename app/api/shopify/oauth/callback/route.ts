import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  encryptShopifyToken,
  getAppUrl,
  getShopifyClientId,
  normalizeShopDomain,
  verifyShopifyCallbackHmac,
  verifyShopifyState,
} from "@/lib/shopify";

type ShopifyTokenResponse = {
  access_token?: string;
  scope?: string;
};

function redirectToProducts(params: Record<string, string>) {
  const url = new URL("/seller/products/new", getAppUrl());
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const shop = normalizeShopDomain(url.searchParams.get("shop"));
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state") ?? "";
  const verifiedState = verifyShopifyState(state);

  if (!shop || !code || !verifiedState || verifiedState.shop !== shop) {
    return redirectToProducts({ shopify: "error", reason: "invalid_oauth" });
  }

  if (!verifyShopifyCallbackHmac(url.searchParams)) {
    return redirectToProducts({ shopify: "error", reason: "invalid_signature" });
  }

  const tokenRes = await fetch(`https://${shop}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: getShopifyClientId(),
      client_secret: process.env.SHOPIFY_API_SECRET,
      code,
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return redirectToProducts({ shopify: "error", reason: "token_exchange" });
  }

  const tokenData = (await tokenRes.json()) as ShopifyTokenResponse;
  const accessToken = tokenData.access_token?.trim();

  if (!accessToken) {
    return redirectToProducts({ shopify: "error", reason: "missing_token" });
  }

  await prisma.shopifyConnection.upsert({
    where: { userId: verifiedState.userId },
    update: {
      shopDomain: shop,
      accessToken: encryptShopifyToken(accessToken),
      scope: tokenData.scope ?? null,
      installedAt: new Date(),
    },
    create: {
      userId: verifiedState.userId,
      shopDomain: shop,
      accessToken: encryptShopifyToken(accessToken),
      scope: tokenData.scope ?? null,
    },
  });

  return redirectToProducts({ shopify: "connected", shop });
}
