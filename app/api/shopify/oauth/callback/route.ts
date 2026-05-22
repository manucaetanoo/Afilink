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
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
  scope?: string;
};

function getExpiresAt(seconds: unknown) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(Date.now() + value * 1000);
}

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
      expiring: "1",
    }),
    cache: "no-store",
  });

  if (!tokenRes.ok) {
    return redirectToProducts({ shopify: "error", reason: "token_exchange" });
  }

  const tokenData = (await tokenRes.json()) as ShopifyTokenResponse;
  const accessToken = tokenData.access_token?.trim();
  const refreshToken = tokenData.refresh_token?.trim();

  if (!accessToken || !refreshToken) {
    return redirectToProducts({ shopify: "error", reason: "missing_token" });
  }

  const encryptedRefreshToken = encryptShopifyToken(refreshToken);
  const accessTokenExpiresAt = getExpiresAt(tokenData.expires_in);
  const refreshTokenExpiresAt = getExpiresAt(tokenData.refresh_token_expires_in);

  await prisma.shopifyConnection.upsert({
    where: { userId: verifiedState.userId },
    update: {
      shopDomain: shop,
      accessToken: encryptShopifyToken(accessToken),
      accessTokenExpiresAt,
      refreshToken: encryptedRefreshToken,
      refreshTokenExpiresAt,
      scope: tokenData.scope ?? null,
      installedAt: new Date(),
    },
    create: {
      userId: verifiedState.userId,
      shopDomain: shop,
      accessToken: encryptShopifyToken(accessToken),
      accessTokenExpiresAt,
      refreshToken: encryptedRefreshToken,
      refreshTokenExpiresAt,
      scope: tokenData.scope ?? null,
    },
  });

  return redirectToProducts({ shopify: "connected", shop });
}
