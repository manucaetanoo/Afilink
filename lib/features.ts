export function isShopifyEnabled() {
  return process.env.SHOPIFY_ENABLED === "true";
}

export function isPublicShopifyEnabled() {
  return process.env.NEXT_PUBLIC_SHOPIFY_ENABLED === "true";
}

export function isShopifyBillingEnabled() {
  return isShopifyEnabled() && process.env.SHOPIFY_BILLING_ENABLED === "true";
}

export function isPublicShopifyBillingEnabled() {
  return (
    isPublicShopifyEnabled() &&
    process.env.NEXT_PUBLIC_SHOPIFY_BILLING_ENABLED === "true"
  );
}
