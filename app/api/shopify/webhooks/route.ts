import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeShopDomain } from "@/lib/shopify";
import { processShopifyPaidOrder } from "@/lib/shopify-orders";
import { isShopifyEnabled } from "@/lib/features";

function verifyShopifyWebhookHmac(rawBody: string, hmacHeader: string | null) {
  const secret = process.env.SHOPIFY_API_SECRET?.trim();
  if (!secret || !hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("base64");

  if (digest.length !== hmacHeader.length) return false;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ ok: false, error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = normalizeShopDomain(req.headers.get("x-shopify-shop-domain"));

  if (!isShopifyEnabled()) {
    return NextResponse.json({ ok: true, ignored: "shopify_disabled" });
  }

  if (topic === "app/uninstalled" || topic === "shop/redact") {
    if (shop) {
      await prisma.shopifyConnection.deleteMany({
        where: { shopDomain: shop },
      });
    }
  }

  if ((topic === "orders/paid" || topic === "orders/create") && shop) {
    const payload = JSON.parse(rawBody);
    await processShopifyPaidOrder({ shopDomain: shop, payload });
  }

  return NextResponse.json({ ok: true });
}
