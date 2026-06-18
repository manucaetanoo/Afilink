import { prisma } from "@/lib/prisma";
import {
  decryptShopifyToken,
  encryptShopifyToken,
  getShopifyClientId,
  SHOPIFY_API_VERSION,
} from "@/lib/shopify";

type ShopifyVariantMetadata = {
  id?: unknown;
  option1?: unknown;
  option2?: unknown;
  option3?: unknown;
};

type ShopifyRefreshTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  refresh_token_expires_in?: number;
};

type ShopifyGraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type OrderCreateResponse = {
  orderCreate?: {
    userErrors?: Array<{ field?: string[]; message?: string }>;
    order?: {
      id?: string;
      name?: string | null;
    } | null;
  } | null;
};

const TOKEN_REFRESH_BUFFER_MS = 5 * 60 * 1000;

function getExpiresAt(seconds: unknown) {
  const value = Number(seconds);
  if (!Number.isFinite(value) || value <= 0) return null;
  return new Date(Date.now() + value * 1000);
}

function shouldRefreshAccessToken(expiresAt: Date | null | undefined) {
  if (!expiresAt) return false;
  return expiresAt.getTime() - Date.now() <= TOKEN_REFRESH_BUFFER_MS;
}

function cleanUndefined<T>(value: T): T {
  if (Array.isArray(value)) {
    return value
      .map((item) => cleanUndefined(item))
      .filter((item) => item !== undefined) as T;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, nested]) => [key, cleanUndefined(nested)] as const)
      .filter(([, nested]) => nested !== undefined && nested !== "");

    return Object.fromEntries(entries) as T;
  }

  return value;
}

function getShopifyVariantId({
  fallbackVariantId,
  variants,
  selectedSize,
  selectedColor,
}: {
  fallbackVariantId: string | null;
  variants: unknown;
  selectedSize?: string | null;
  selectedColor?: string | null;
}) {
  const selectedOptions = [selectedSize, selectedColor]
    .map((value) => value?.trim().toUpperCase())
    .filter((value): value is string => Boolean(value));

  if (selectedOptions.length && Array.isArray(variants)) {
    const matchedVariant = variants.find((variant): variant is ShopifyVariantMetadata => {
      if (!variant || typeof variant !== "object") return false;

      const options = [
        (variant as ShopifyVariantMetadata).option1,
        (variant as ShopifyVariantMetadata).option2,
        (variant as ShopifyVariantMetadata).option3,
      ]
        .map((option) =>
          typeof option === "string" ? option.trim().toUpperCase() : null
        )
        .filter(Boolean);

      return selectedOptions.every((selectedOption) =>
        options.includes(selectedOption)
      );
    });

    const matchedId = matchedVariant?.id;
    if (typeof matchedId === "string" && matchedId.trim()) return matchedId.trim();
    if (typeof matchedId === "number" && Number.isFinite(matchedId)) {
      return String(matchedId);
    }
  }

  return fallbackVariantId?.trim() || null;
}

function getShopifyGid(type: string, id: string) {
  return id.startsWith("gid://") ? id : `gid://shopify/${type}/${id}`;
}

function extractShopifyNumericId(gid: string | null | undefined) {
  if (!gid) return null;
  const id = gid.split("/").pop()?.trim();
  return id || gid.slice(0, 80);
}

function getCurrency() {
  return (
    process.env.SHOPIFY_ORDER_CURRENCY ||
    process.env.DLOCALGO_CURRENCY ||
    "UYU"
  )
    .trim()
    .toUpperCase();
}

function formatShopifyAmount(amount: number) {
  return amount.toFixed(2);
}

async function refreshShopifyToken(params: {
  userId: string;
  shopDomain: string;
  refreshToken: string;
}) {
  const tokenRes = await fetch(
    `https://${params.shopDomain}/admin/oauth/access_token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: getShopifyClientId(),
        client_secret: process.env.SHOPIFY_API_SECRET,
        grant_type: "refresh_token",
        refresh_token: params.refreshToken,
      }),
      cache: "no-store",
    }
  );

  const tokenData = (await tokenRes.json().catch(() => null)) as
    | ShopifyRefreshTokenResponse
    | null;

  if (!tokenRes.ok || !tokenData?.access_token || !tokenData.refresh_token) {
    throw new Error("Volve a conectar Shopify para renovar los permisos");
  }

  await prisma.shopifyConnection.update({
    where: { userId: params.userId },
    data: {
      accessToken: encryptShopifyToken(tokenData.access_token),
      accessTokenExpiresAt: getExpiresAt(tokenData.expires_in),
      refreshToken: encryptShopifyToken(tokenData.refresh_token),
      refreshTokenExpiresAt: getExpiresAt(tokenData.refresh_token_expires_in),
    },
  });

  return tokenData.access_token;
}

async function getShopifyAccessToken(params: {
  userId: string;
  shopDomain: string;
}) {
  const connection = await prisma.shopifyConnection.findUnique({
    where: { userId: params.userId },
    select: {
      shopDomain: true,
      accessToken: true,
      accessTokenExpiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
  });

  if (!connection) {
    throw new Error("El vendedor no tiene Shopify conectado");
  }

  if (connection.shopDomain !== params.shopDomain) {
    throw new Error("La tienda Shopify del producto no coincide con la conexion");
  }

  if (!shouldRefreshAccessToken(connection.accessTokenExpiresAt)) {
    return decryptShopifyToken(connection.accessToken);
  }

  if (
    !connection.refreshToken ||
    (connection.refreshTokenExpiresAt &&
      connection.refreshTokenExpiresAt.getTime() <= Date.now())
  ) {
    throw new Error("Volve a conectar Shopify para renovar los permisos");
  }

  return refreshShopifyToken({
    userId: params.userId,
    shopDomain: connection.shopDomain,
    refreshToken: decryptShopifyToken(connection.refreshToken),
  });
}

async function shopifyGraphQl<T>({
  shopDomain,
  accessToken,
  query,
  variables,
}: {
  shopDomain: string;
  accessToken: string;
  query: string;
  variables: Record<string, unknown>;
}) {
  const response = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | ShopifyGraphQlResponse<T>
    | null;

  if (!response.ok) {
    throw new Error(`Shopify GraphQL rechazo la orden (${response.status})`);
  }

  if (payload?.errors?.length) {
    throw new Error(
      payload.errors.map((error) => error.message).filter(Boolean).join("; ") ||
        "Shopify devolvio un error GraphQL"
    );
  }

  if (!payload?.data) {
    throw new Error("Shopify no devolvio datos al crear la orden");
  }

  return payload.data;
}

export async function syncShopifyOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              shopifyShopDomain: true,
              shopifyVariantId: true,
              shopifyVariants: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    throw new Error("Orden no encontrada");
  }

  const itemsBySeller = new Map<string, typeof order.items>();

  for (const item of order.items) {
    if (!item.product.shopifyShopDomain || !item.product.shopifyVariantId) {
      continue;
    }

    const sellerItems = itemsBySeller.get(item.sellerId) ?? [];
    sellerItems.push(item);
    itemsBySeller.set(item.sellerId, sellerItems);
  }

  if (itemsBySeller.size === 0) {
    return [];
  }

  const results: Array<{
    sellerId: string;
    status: "SYNCED" | "FAILED";
    externalOrderId?: string;
    error?: string;
  }> = [];

  for (const [sellerId, items] of itemsBySeller) {
    const shopDomain = items[0].product.shopifyShopDomain!;
    const existingSync = await prisma.externalOrderSync.upsert({
      where: {
        orderId_sellerId_channel: {
          orderId,
          sellerId,
          channel: "shopify",
        },
      },
      create: {
        orderId,
        sellerId,
        channel: "shopify",
        externalStoreUrl: shopDomain,
        status: "PENDING",
      },
      update: {
        lastAttemptAt: new Date(),
      },
    });

    if (existingSync.status === "SYNCED" && existingSync.externalOrderId) {
      results.push({
        sellerId,
        status: "SYNCED",
        externalOrderId: existingSync.externalOrderId,
      });
      continue;
    }

    try {
      const accessToken = await getShopifyAccessToken({ userId: sellerId, shopDomain });
      const currency = getCurrency();
      const sellerTotal = items.reduce((sum, item) => sum + item.total, 0);

      const lineItems = items.map((item) => {
        const variantId = getShopifyVariantId({
          fallbackVariantId: item.product.shopifyVariantId,
          variants: item.product.shopifyVariants,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
        });

        if (!variantId) {
          throw new Error(`El producto ${item.product.name} no tiene variante Shopify`);
        }

        return {
          variantId: getShopifyGid("ProductVariant", variantId),
          quantity: item.quantity,
          priceSet: {
            shopMoney: {
              amount: formatShopifyAmount(item.unitPrice),
              currencyCode: currency,
            },
          },
        };
      });

      const orderInput = cleanUndefined({
        email: order.buyerEmail || undefined,
        currency,
        note: `Venta procesada y cobrada en Afilink. Orden Afilink: ${order.id}`,
        tags: ["afilink", "afilink_checkout"],
        lineItems,
        transactions: [
          {
            kind: "SALE",
            status: "SUCCESS",
            amountSet: {
              shopMoney: {
                amount: formatShopifyAmount(sellerTotal),
                currencyCode: currency,
              },
            },
          },
        ],
        billingAddress: {
          firstName: order.buyerName || undefined,
          phone: order.buyerPhone || undefined,
          address1: [order.shippingStreet, order.shippingNumber].filter(Boolean).join(" "),
          address2: order.shippingApartment || undefined,
          city: order.shippingCity || undefined,
          province: order.shippingState || undefined,
          zip: order.shippingPostalCode || undefined,
          countryCode: order.shippingCountry || "UY",
        },
        shippingAddress: {
          firstName: order.buyerName || undefined,
          phone: order.buyerPhone || undefined,
          address1: [order.shippingStreet, order.shippingNumber].filter(Boolean).join(" "),
          address2: order.shippingApartment || undefined,
          city: order.shippingCity || undefined,
          province: order.shippingState || undefined,
          zip: order.shippingPostalCode || undefined,
          countryCode: order.shippingCountry || "UY",
        },
      });

      const data = await shopifyGraphQl<OrderCreateResponse>({
        shopDomain,
        accessToken,
        query: `
          mutation orderCreate($order: OrderCreateOrderInput!, $options: OrderCreateOptionsInput) {
            orderCreate(order: $order, options: $options) {
              userErrors {
                field
                message
              }
              order {
                id
                name
              }
            }
          }
        `,
        variables: {
          order: orderInput,
          options: {
            inventoryBehaviour: "DECREMENT_OBEYING_POLICY",
            sendReceipt: false,
            sendFulfillmentReceipt: false,
          },
        },
      });

      const userErrors = data.orderCreate?.userErrors ?? [];
      if (userErrors.length) {
        throw new Error(
          userErrors
            .map((error) =>
              [error.field?.join("."), error.message].filter(Boolean).join(": ")
            )
            .join("; ")
        );
      }

      const shopifyOrderGid = data.orderCreate?.order?.id;
      const shopifyOrderId = extractShopifyNumericId(shopifyOrderGid);
      if (!shopifyOrderId) {
        throw new Error("Shopify no devolvio el ID de la orden creada");
      }

      await prisma.$transaction(async (tx) => {
        await tx.externalOrderSync.update({
          where: { id: existingSync.id },
          data: {
            externalStoreUrl: shopDomain,
            externalOrderId: shopifyOrderId,
            status: "SYNCED",
            error: null,
            lastAttemptAt: new Date(),
            syncedAt: new Date(),
          },
        });

        await tx.order.update({
          where: { id: order.id },
          data: {
            shopifyShopDomain: shopDomain,
            shopifyOrderId,
            shopifyOrderName: data.orderCreate?.order?.name?.slice(0, 80) ?? null,
          },
        });
      });

      results.push({
        sellerId,
        status: "SYNCED",
        externalOrderId: shopifyOrderId,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo sincronizar Shopify";

      await prisma.externalOrderSync.update({
        where: { id: existingSync.id },
        data: {
          status: "FAILED",
          error: message,
          lastAttemptAt: new Date(),
        },
      });

      results.push({ sellerId, status: "FAILED", error: message });
    }
  }

  return results;
}
