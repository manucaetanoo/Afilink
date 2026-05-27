import { prisma } from "@/lib/prisma";
import {
  decryptShopifyToken,
  encryptShopifyToken,
  getAppUrl,
  getShopifyClientId,
  SHOPIFY_API_VERSION,
} from "@/lib/shopify";

type ShopifyGraphQlResponse<T> = {
  data?: T;
  errors?: Array<{ message?: string }>;
};

type CurrentAppInstallationResponse = {
  currentAppInstallation?: {
    activeSubscriptions?: Array<{
      id: string;
      status: string;
      lineItems: Array<{
        id: string;
        plan: {
          pricingDetails: {
            __typename: string;
          };
        };
      }>;
    }>;
  };
};

type AppUsageRecordCreateResponse = {
  appUsageRecordCreate?: {
    userErrors: Array<{ field?: string[]; message: string }>;
    appUsageRecord?: {
      id: string;
    } | null;
  };
};

type AppSubscriptionCreateResponse = {
  appSubscriptionCreate?: {
    userErrors: Array<{ field?: string[]; message: string }>;
    confirmationUrl?: string | null;
    appSubscription?: {
      id: string;
    } | null;
  };
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
    | {
        access_token?: string;
        expires_in?: number;
        refresh_token?: string;
        refresh_token_expires_in?: number;
      }
    | null;

  if (!tokenRes.ok || !tokenData?.access_token || !tokenData.refresh_token) {
    throw new Error("No se pudo renovar el token de Shopify");
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

async function getAccessToken(shopDomain: string) {
  const connection = await prisma.shopifyConnection.findUnique({
    where: { shopDomain },
    select: {
      userId: true,
      shopDomain: true,
      accessToken: true,
      accessTokenExpiresAt: true,
      refreshToken: true,
      refreshTokenExpiresAt: true,
    },
  });

  if (!connection) {
    throw new Error("Tienda Shopify no conectada");
  }

  if (shouldRefreshAccessToken(connection.accessTokenExpiresAt)) {
    if (
      !connection.refreshToken ||
      (connection.refreshTokenExpiresAt &&
        connection.refreshTokenExpiresAt.getTime() <= Date.now())
    ) {
      throw new Error("Volve a conectar Shopify para renovar permisos");
    }

    return refreshShopifyToken({
      userId: connection.userId,
      shopDomain,
      refreshToken: decryptShopifyToken(connection.refreshToken),
    });
  }

  return decryptShopifyToken(connection.accessToken);
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
  variables?: Record<string, unknown>;
}) {
  const response = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`,
    {
      method: "POST",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, variables }),
      cache: "no-store",
    }
  );

  const payload = (await response.json().catch(() => null)) as
    | ShopifyGraphQlResponse<T>
    | null;

  if (!response.ok || payload?.errors?.length) {
    const message =
      payload?.errors?.map((error) => error.message).filter(Boolean).join("; ") ||
      `Shopify GraphQL error ${response.status}`;
    throw new Error(message);
  }

  if (!payload?.data) {
    throw new Error("Shopify no devolvio datos de billing");
  }

  return payload.data;
}

async function getUsageLineItemId(shopDomain: string, accessToken: string) {
  const data = await shopifyGraphQl<CurrentAppInstallationResponse>({
    shopDomain,
    accessToken,
    query: `
      query CurrentAppInstallationBilling {
        currentAppInstallation {
          activeSubscriptions {
            id
            status
            lineItems {
              id
              plan {
                pricingDetails {
                  __typename
                }
              }
            }
          }
        }
      }
    `,
  });

  const activeSubscriptions =
    data.currentAppInstallation?.activeSubscriptions?.filter(
      (subscription) => subscription.status === "ACTIVE"
    ) ?? [];

  for (const subscription of activeSubscriptions) {
    const usageLineItem = subscription.lineItems.find(
      (lineItem) =>
        lineItem.plan.pricingDetails.__typename === "AppUsagePricing"
    );

    if (usageLineItem) return usageLineItem.id;
  }

  throw new Error(
    "La tienda no tiene un plan activo con cobro por uso aprobado en Shopify"
  );
}

function toBillingAmount(amount: number) {
  return Math.max(0, amount).toFixed(2);
}

export async function createShopifyUsageCharge({
  shopDomain,
  orderId,
  shopifyOrderName,
  amount,
  currency,
}: {
  shopDomain: string;
  orderId: string;
  shopifyOrderName: string | null;
  amount: number;
  currency: string;
}) {
  if (amount <= 0) {
    throw new Error("El cargo de Shopify debe ser mayor a cero");
  }

  const accessToken = await getAccessToken(shopDomain);
  const subscriptionLineItemId = await getUsageLineItemId(shopDomain, accessToken);
  const description = `Comision Afilink por venta Shopify ${
    shopifyOrderName ?? orderId
  }`;

  const data = await shopifyGraphQl<AppUsageRecordCreateResponse>({
    shopDomain,
    accessToken,
    query: `
      mutation CreateUsageCharge(
        $description: String!
        $price: MoneyInput!
        $subscriptionLineItemId: ID!
        $idempotencyKey: String
      ) {
        appUsageRecordCreate(
          description: $description
          price: $price
          subscriptionLineItemId: $subscriptionLineItemId
          idempotencyKey: $idempotencyKey
        ) {
          userErrors {
            field
            message
          }
          appUsageRecord {
            id
          }
        }
      }
    `,
    variables: {
      description,
      subscriptionLineItemId,
      idempotencyKey: `afilink-shopify-order-${orderId}`,
      price: {
        amount: toBillingAmount(amount),
        currencyCode: currency,
      },
    },
  });

  const result = data.appUsageRecordCreate;
  const userErrors = result?.userErrors ?? [];

  if (userErrors.length || !result?.appUsageRecord?.id) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }

  return result.appUsageRecord.id;
}

export async function createShopifyUsageBillingApproval({
  shopDomain,
}: {
  shopDomain: string;
}) {
  const accessToken = await getAccessToken(shopDomain);
  const cappedAmount = Number(process.env.SHOPIFY_BILLING_CAPPED_AMOUNT ?? 1000);
  const currencyCode = (process.env.SHOPIFY_BILLING_CURRENCY ?? "USD")
    .trim()
    .toUpperCase();
  const test = process.env.SHOPIFY_BILLING_TEST !== "false";

  if (!Number.isFinite(cappedAmount) || cappedAmount <= 0) {
    throw new Error("SHOPIFY_BILLING_CAPPED_AMOUNT invalido");
  }

  const data = await shopifyGraphQl<AppSubscriptionCreateResponse>({
    shopDomain,
    accessToken,
    query: `
      mutation CreateUsageBillingApproval(
        $name: String!
        $returnUrl: URL!
        $test: Boolean
        $lineItems: [AppSubscriptionLineItemInput!]!
      ) {
        appSubscriptionCreate(
          name: $name
          returnUrl: $returnUrl
          test: $test
          lineItems: $lineItems
        ) {
          userErrors {
            field
            message
          }
          confirmationUrl
          appSubscription {
            id
          }
        }
      }
    `,
    variables: {
      name: "Comisiones Afilink",
      returnUrl: `${getAppUrl()}/seller/products/new?shopify=billing_approved`,
      test,
      lineItems: [
        {
          plan: {
            appUsagePricingDetails: {
              terms:
                "Afilink cobra las comisiones generadas por ventas atribuidas desde la plataforma.",
              cappedAmount: {
                amount: cappedAmount,
                currencyCode,
              },
            },
          },
        },
      ],
    },
  });

  const result = data.appSubscriptionCreate;
  const userErrors = result?.userErrors ?? [];

  if (userErrors.length || !result?.confirmationUrl) {
    throw new Error(userErrors.map((error) => error.message).join("; "));
  }

  return result.confirmationUrl;
}
