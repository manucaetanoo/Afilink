export function isShopifyEnabled() {
  return process.env.SHOPIFY_ENABLED === "true";
}

export function isPublicShopifyEnabled() {
  return process.env.NEXT_PUBLIC_SHOPIFY_ENABLED === "true";
}

function getShopifyReviewEmails() {
  return new Set(
    (process.env.SHOPIFY_REVIEW_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );
}

function getShopifyReviewDomains() {
  return new Set(
    (process.env.SHOPIFY_REVIEW_DOMAINS ?? "")
      .split(",")
      .map((domain) => domain.trim().replace(/^@/, "").toLowerCase())
      .filter(Boolean)
  );
}

function isShopifyReviewEmail(email?: string | null) {
  if (!email) return false;

  const normalizedEmail = email.trim().toLowerCase();
  const domain = normalizedEmail.split("@")[1] ?? "";

  return (
    getShopifyReviewEmails().has(normalizedEmail) ||
    getShopifyReviewDomains().has(domain)
  );
}

export function isShopifyEnabledForEmail(email?: string | null) {
  if (isShopifyEnabled()) return true;
  return isShopifyReviewEmail(email);
}

export function isShopifyVisibleForEmail(email?: string | null) {
  if (isPublicShopifyEnabled()) return true;
  return isShopifyReviewEmail(email);
}
