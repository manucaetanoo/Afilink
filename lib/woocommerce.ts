import crypto from "crypto";

export type WooCommerceProduct = {
  id: number;
  name?: string;
  description?: string;
  short_description?: string;
  type?: string;
  status?: string;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  in_stock?: boolean;
  categories?: Array<{ name?: string }>;
  images?: Array<{ src?: string }>;
  variations?: number[];
};

export type WooCommerceVariation = {
  id: number;
  price?: string;
  regular_price?: string;
  sale_price?: string;
  stock_quantity?: number | null;
  manage_stock?: boolean;
  in_stock?: boolean;
  attributes?: Array<{ name?: string; option?: string }>;
};

type WooCommerceRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export type WooCommerceWebhook = {
  id: number;
  name?: string;
  status?: string;
  topic?: string;
  delivery_url?: string;
};

function encodeOAuthValue(value: string | number) {
  return encodeURIComponent(String(value))
    .replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}

function createOAuthNonce() {
  return crypto.randomBytes(16).toString("hex");
}

function signOAuthRequest({
  method,
  url,
  consumerKey,
  consumerSecret,
}: {
  method: string;
  url: URL;
  consumerKey: string;
  consumerSecret: string;
}) {
  const oauthParams = new URLSearchParams({
    oauth_consumer_key: consumerKey,
    oauth_nonce: createOAuthNonce(),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: String(Math.floor(Date.now() / 1000)),
    oauth_version: "1.0",
  });

  const signatureParams: Array<[string, string]> = [];
  url.searchParams.forEach((value, key) => signatureParams.push([key, value]));
  oauthParams.forEach((value, key) => signatureParams.push([key, value]));

  const normalizedParams = signatureParams
    .map(([key, value]) => [encodeOAuthValue(key), encodeOAuthValue(value)] as const)
    .sort(([aKey, aValue], [bKey, bValue]) =>
      aKey === bKey ? aValue.localeCompare(bValue) : aKey.localeCompare(bKey)
    )
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const baseUrl = `${url.protocol}//${url.host}${url.pathname}`;
  const signatureBase = [
    method.toUpperCase(),
    encodeOAuthValue(baseUrl),
    encodeOAuthValue(normalizedParams),
  ].join("&");
  const signingKey = `${encodeOAuthValue(consumerSecret)}&`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(signatureBase)
    .digest("base64");

  oauthParams.set("oauth_signature", signature);
  oauthParams.forEach((value, key) => url.searchParams.set(key, value));
}

function getEncryptionSecret() {
  const secret =
    process.env.WOOCOMMERCE_ENCRYPTION_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.SHOPIFY_API_SECRET;

  if (!secret?.trim()) {
    throw new Error(
      "Falta WOOCOMMERCE_ENCRYPTION_SECRET, NEXTAUTH_SECRET o AUTH_SECRET"
    );
  }

  return secret.trim();
}

function getEncryptionKey() {
  return crypto.createHash("sha256").update(getEncryptionSecret()).digest();
}

function base64UrlEncode(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

export function encryptWooCommerceSecret(value: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [
    "v1",
    base64UrlEncode(iv),
    base64UrlEncode(authTag),
    base64UrlEncode(encrypted),
  ].join(".");
}

export function decryptWooCommerceSecret(value: string) {
  if (!value.startsWith("v1.")) return value;

  const [, iv, authTag, encrypted] = value.split(".");
  if (!iv || !authTag || !encrypted) {
    throw new Error("Credencial de WooCommerce invalida");
  }

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

export function normalizeWooCommerceStoreUrl(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const rawWithoutProtocol = raw.replace(/^https?:\/\//i, "");
  const hostnameCandidate = rawWithoutProtocol.split(/[/:]/)[0]?.toLowerCase() ?? "";
  const shouldDefaultToHttp =
    process.env.NODE_ENV !== "production" &&
    (hostnameCandidate === "localhost" ||
      hostnameCandidate === "127.0.0.1" ||
      hostnameCandidate.endsWith(".local"));
  const withProtocol = /^https?:\/\//i.test(raw)
    ? raw
    : `${shouldDefaultToHttp ? "http" : "https"}://${raw}`;

  try {
    const url = new URL(withProtocol);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const isProduction = process.env.NODE_ENV === "production";
    const isLocalHost =
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".local");
    const isPublicHost = /^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}$/i.test(url.hostname);

    if (!isPublicHost && (isProduction || !isLocalHost)) return null;

    return `${url.protocol}//${url.host}`.toLowerCase().replace(/\/$/, "");
  } catch {
    return null;
  }
}

export function createWooCommerceClient({
  storeUrl,
  consumerKey,
  consumerSecret,
}: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
  const normalizedStoreUrl = normalizeWooCommerceStoreUrl(storeUrl);
  if (!normalizedStoreUrl) throw new Error("URL de WooCommerce invalida");
  const baseUrl = normalizedStoreUrl;

  async function request<T>(path: string, options: WooCommerceRequestOptions = {}) {
    const method = options.method ?? "GET";
    const url = new URL(`/wp-json/wc/v3/${path.replace(/^\//, "")}`, baseUrl);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (url.protocol === "http:") {
      signOAuthRequest({
        method,
        url,
        consumerKey,
        consumerSecret,
      });
    } else {
      url.searchParams.set("consumer_key", consumerKey);
      url.searchParams.set("consumer_secret", consumerSecret);
      const basicAuth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");
      headers.Authorization = `Basic ${basicAuth}`;
    }

    const response = await fetch(url.toString(), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      cache: "no-store",
    });

    const text = await response.text();
    const data = text ? JSON.parse(text) : null;

    if (!response.ok) {
      const message =
        data?.message ||
        data?.error ||
        response.statusText ||
        "WooCommerce rechazo la solicitud";
      throw new Error(`WooCommerce (${response.status}): ${message}`);
    }

    return data as T;
  }

  return { request, storeUrl: baseUrl };
}

function getBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export function getWooCommerceWebhookSecret() {
  const secret =
    process.env.WOOCOMMERCE_WEBHOOK_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET;

  if (!secret?.trim()) {
    throw new Error(
      "Falta WOOCOMMERCE_WEBHOOK_SECRET, NEXTAUTH_SECRET o AUTH_SECRET"
    );
  }

  return secret.trim();
}

export function getWooCommerceWebhookUrl() {
  return `${getBaseUrl()}/api/woocommerce/webhooks`;
}

export function verifyWooCommerceWebhookSignature({
  body,
  signature,
}: {
  body: string;
  signature: string | null;
}) {
  if (!signature) return false;

  const expected = crypto
    .createHmac("sha256", getWooCommerceWebhookSecret())
    .update(body, "utf8")
    .digest("base64");

  const signatureBuffer = Buffer.from(signature.trim());
  const expectedBuffer = Buffer.from(expected);

  if (signatureBuffer.length !== expectedBuffer.length) return false;
  return crypto.timingSafeEqual(signatureBuffer, expectedBuffer);
}

export async function ensureWooCommerceStockWebhooks(
  client: ReturnType<typeof createWooCommerceClient>
) {
  const deliveryUrl = getWooCommerceWebhookUrl();
  const secret = getWooCommerceWebhookSecret();
  const topics = ["order.created", "order.updated", "product.updated"];
  const existingWebhooks = await client.request<WooCommerceWebhook[]>(
    "webhooks?per_page=100"
  );

  await Promise.all(
    topics.map(async (topic) => {
      const existing = existingWebhooks.find(
        (webhook) =>
          webhook.topic === topic && webhook.delivery_url === deliveryUrl
      );
      const payload = {
        name: `Afilink stock sync ${topic}`,
        topic,
        delivery_url: deliveryUrl,
        secret,
        status: "active",
      };

      if (existing?.id) {
        await client.request(`webhooks/${existing.id}`, {
          method: "PUT",
          body: payload,
        });
        return;
      }

      await client.request("webhooks", {
        method: "POST",
        body: payload,
      });
    })
  );
}

export async function deleteWooCommerceStockWebhooks(
  client: ReturnType<typeof createWooCommerceClient>
) {
  const deliveryUrl = getWooCommerceWebhookUrl();
  const existingWebhooks = await client.request<WooCommerceWebhook[]>(
    "webhooks?per_page=100"
  );
  const matchingWebhooks = existingWebhooks.filter(
    (webhook) => webhook.delivery_url === deliveryUrl
  );

  await Promise.all(
    matchingWebhooks.map((webhook) =>
      client.request(`webhooks/${webhook.id}?force=true`, {
        method: "DELETE",
      })
    )
  );
}

export function stripWooCommerceHtml(value: string | null | undefined) {
  return String(value ?? "")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getWooCommercePrice(
  item: Pick<WooCommerceProduct | WooCommerceVariation, "price" | "sale_price" | "regular_price">
) {
  const price = Number(item.price || item.sale_price || item.regular_price);
  return Number.isFinite(price) && price > 0 ? Math.round(price) : null;
}

export function getWooCommerceStock(
  item: Pick<WooCommerceProduct | WooCommerceVariation, "stock_quantity">
) {
  const stock = Number(item.stock_quantity ?? 0);
  if (Number.isFinite(stock) && stock > 0) return Math.floor(stock);
  return 0;
}

export function getWooCommerceVariantMetadata(variations: WooCommerceVariation[]) {
  return variations.map((variation) => ({
    id: String(variation.id),
    attributes: (variation.attributes ?? [])
      .map((attribute) => ({
        name: attribute.name ?? null,
        option: attribute.option ?? null,
      }))
      .filter((attribute) => attribute.option),
  }));
}
