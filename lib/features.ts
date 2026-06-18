export function isShopifyEnabled() {
  return process.env.SHOPIFY_ENABLED === "true";
}

export function isPublicShopifyEnabled() {
  return process.env.NEXT_PUBLIC_SHOPIFY_ENABLED === "true";
}
