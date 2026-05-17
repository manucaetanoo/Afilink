import crypto from "crypto";

export const SHOPIFY_API_VERSION = "2026-04";
export const SHOPIFY_SCOPES = ["read_products", "read_inventory"].join(",");

type ShopifyOAuthState = {
  userId: string;
  shop: string;
  exp: number;
  nonce: string;
};

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Falta ${name} en el entorno`);
  return value;
}

function getSecret() {
  return getRequiredEnv("SHOPIFY_API_SECRET");
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getSecret()).digest();
}

function base64UrlEncode(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSecret()).update(value).digest("base64url");
}

export function normalizeShopDomain(value: unknown) {
  const raw = String(value ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .toLowerCase();

  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(raw)) {
    return null;
  }

  return raw;
}

export function getAppUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    process.env.NEXTAUTH_URL?.trim() ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getShopifyClientId() {
  return getRequiredEnv("SHOPIFY_API_KEY");
}

export function createShopifyState(userId: string, shop: string) {
  const payload: ShopifyOAuthState = {
    userId,
    shop,
    exp: Date.now() + 10 * 60 * 1000,
    nonce: crypto.randomBytes(16).toString("hex"),
  };
  const encoded = base64UrlEncode(JSON.stringify(payload));
  return `${encoded}.${sign(encoded)}`;
}

export function verifyShopifyState(state: string) {
  const [encoded, signature] = state.split(".");
  if (!encoded || !signature) return null;

  const expected = sign(encoded);
  if (signature.length !== expected.length) return null;
  if (
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    )
  ) {
    return null;
  }

  const payload = JSON.parse(base64UrlDecode(encoded)) as ShopifyOAuthState;
  if (!payload.userId || !payload.shop || payload.exp < Date.now()) return null;
  return payload;
}

export function verifyShopifyCallbackHmac(searchParams: URLSearchParams) {
  const hmac = searchParams.get("hmac");
  if (!hmac) return false;

  const message = Array.from(searchParams.entries())
    .filter(([key]) => key !== "hmac" && key !== "signature")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const digest = crypto.createHmac("sha256", getSecret()).update(message).digest("hex");

  if (hmac.length !== digest.length) return false;
  return crypto.timingSafeEqual(Buffer.from(hmac), Buffer.from(digest));
}

export function encryptShopifyToken(token: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    base64UrlEncode(iv),
    base64UrlEncode(authTag),
    base64UrlEncode(encrypted),
  ].join(".");
}

export function decryptShopifyToken(value: string) {
  if (!value.startsWith("v1.")) return value;

  const [, iv, authTag, encrypted] = value.split(".");
  if (!iv || !authTag || !encrypted) throw new Error("Token de Shopify invalido");

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    getEncryptionKey(),
    Buffer.from(iv, "base64url")
  );
  decipher.setAuthTag(Buffer.from(authTag, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encrypted, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
