import { NextResponse } from "next/server";
import {
  normalizeWooCommerceStoreUrl,
  verifyWooCommerceWebhookSignature,
} from "@/lib/woocommerce";
import { syncWooCommerceStockFromWebhook } from "@/lib/woocommerce-stock-sync";

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-wc-webhook-signature");

  if (!verifyWooCommerceWebhookSignature({ body: rawBody, signature })) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const source = normalizeWooCommerceStoreUrl(req.headers.get("x-wc-webhook-source"));
  if (!source) {
    return NextResponse.json({ ok: false, error: "Missing source" }, { status: 400 });
  }

  let payload: unknown = null;
  try {
    payload = rawBody ? JSON.parse(rawBody) : null;
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }
  const result = await syncWooCommerceStockFromWebhook({
    storeUrl: source,
    payload,
  });

  return NextResponse.json({ ok: true, ...result });
}
