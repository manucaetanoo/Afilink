"use client";
import { trackMetaCommerce } from "@/lib/meta-pixel";

type BrowserStage = "product_view" | "buy_click" | "checkout_started" | "payment_ready" | "checkout_error";
const seen = new Map<string, number>();
declare global { interface Window { gtag?: (command: "event", event: string, params: Record<string, unknown>) => void } }
export function trackPurchaseStage(name: BrowserStage, productId?: string, orderId?: string) {
  const key = `${name}:${productId ?? orderId ?? ""}`;
  if (Date.now() - (seen.get(key) ?? 0) < 30 * 60 * 1000) return;
  seen.set(key, Date.now());
  void fetch("/api/analytics/purchase", { method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, productId, orderId }), keepalive: true,
  }).then(response => {
    if (!response.ok) { seen.delete(key); return; }
    const event = { product_view: "view_item", buy_click: "buy_now_click", checkout_started: "begin_checkout", payment_ready: "add_payment_info", checkout_error: "checkout_error" }[name];
    window.gtag?.("event", event, { currency: "UYU", ...(productId ? { items: [{ item_id: productId }] } : {}) });
    const metaEvent = { product_view: "ViewContent", checkout_started: "InitiateCheckout", payment_ready: "AddPaymentInfo" }[name as "product_view" | "checkout_started" | "payment_ready"];
    if (metaEvent && productId) trackMetaCommerce(metaEvent as "ViewContent" | "InitiateCheckout" | "AddPaymentInfo", productId);
  }).catch(() => seen.delete(key));
}

export function trackVerifiedPurchase(orderId: string, productId: string, total: number) {
  const key = `afilink_purchase:${orderId}`;
  try { if (window.localStorage.getItem(key)) return; } catch { /* Storage can be unavailable in private browsers. */ }
  window.gtag?.("event", "purchase", { transaction_id: orderId, currency: "UYU", value: total, items: [{ item_id: productId }] });
  trackMetaCommerce("Purchase", productId, total, `order:${orderId}`);
  try { window.localStorage.setItem(key, "1"); } catch { /* Server metrics still deduplicate by order. */ }
}
