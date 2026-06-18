import crypto from "crypto";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeShopDomain } from "@/lib/shopify";
import { processShopifyPaidOrder } from "@/lib/shopify-orders";
import { isShopifyEnabled } from "@/lib/features";

export const runtime = "nodejs";

function verifyShopifyWebhookHmac(rawBody: Buffer, hmacHeader: string | null) {
  const secret = process.env.SHOPIFY_API_SECRET?.trim();
  if (!secret || !hmacHeader) return false;

  const digest = crypto
    .createHmac("sha256", secret)
    .update(rawBody)
    .digest("base64");

  if (digest.length !== hmacHeader.length) return false;

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

export async function POST(req: Request) {
  const rawBody = Buffer.from(await req.arrayBuffer());
  const hmac = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhookHmac(rawBody, hmac)) {
    return NextResponse.json({ ok: false, error: "Invalid HMAC" }, { status: 401 });
  }

  const topic = req.headers.get("x-shopify-topic") ?? "";
  const shop = normalizeShopDomain(req.headers.get("x-shopify-shop-domain"));

  if (topic === "app/uninstalled" || topic === "shop/redact") {
    if (shop) {
      await prisma.shopifyConnection.deleteMany({
        where: { shopDomain: shop },
      });
    }

    return NextResponse.json({ ok: true });
  }

  if (!isShopifyEnabled()) {
    return NextResponse.json({ ok: true, ignored: "shopify_disabled" });
  }

  if ((topic === "orders/paid" || topic === "orders/create") && shop) {
    const payload = JSON.parse(rawBody.toString("utf8"));
    await processShopifyPaidOrder({ shopDomain: shop, payload });
  }

  return NextResponse.json({ ok: true });
}
