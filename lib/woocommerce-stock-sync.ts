import { Prisma } from "@prisma/client";
import { revalidatePath, revalidateTag } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  createWooCommerceClient,
  decryptWooCommerceSecret,
  getWooCommerceStock,
  type WooCommerceProduct,
  type WooCommerceVariation,
} from "@/lib/woocommerce";

type WooCommerceOrderWebhookPayload = {
  line_items?: Array<{
    product_id?: number | string | null;
    variation_id?: number | string | null;
  }>;
};

type WooCommerceProductWebhookPayload = {
  id?: number | string | null;
  parent_id?: number | string | null;
};

function toExternalId(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "string" && value.trim()) return value.trim();
  return null;
}

function getProductIdsFromWebhookPayload(payload: unknown) {
  const productIds = new Set<string>();

  if (payload && typeof payload === "object") {
    const orderPayload = payload as WooCommerceOrderWebhookPayload;
    for (const item of orderPayload.line_items ?? []) {
      const productId = toExternalId(item.product_id);
      if (productId) productIds.add(productId);
    }

    const productPayload = payload as WooCommerceProductWebhookPayload;
    const parentId = toExternalId(productPayload.parent_id);
    const ownId = toExternalId(productPayload.id);
    if (parentId && parentId !== "0") productIds.add(parentId);
    else if (ownId) productIds.add(ownId);
  }

  return Array.from(productIds);
}

function getProductStock(product: WooCommerceProduct, variations: WooCommerceVariation[]) {
  if (variations.length > 0) {
    return variations.reduce((sum, variation) => sum + getWooCommerceStock(variation), 0);
  }

  return getWooCommerceStock(product);
}

function getVariantMetadata(variations: WooCommerceVariation[]) {
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

export async function syncWooCommerceProductStock({
  storeUrl,
  productIds,
}: {
  storeUrl: string;
  productIds: string[];
}) {
  const uniqueProductIds = Array.from(new Set(productIds.map(toExternalId).filter(Boolean)));
  if (uniqueProductIds.length === 0) return { updated: 0, skipped: 0 };

  const connection = await prisma.wooCommerceConnection.findUnique({
    where: { storeUrl },
    select: {
      userId: true,
      storeUrl: true,
      consumerKey: true,
      consumerSecret: true,
    },
  });

  if (!connection) return { updated: 0, skipped: uniqueProductIds.length };

  const client = createWooCommerceClient({
    storeUrl: connection.storeUrl,
    consumerKey: decryptWooCommerceSecret(connection.consumerKey),
    consumerSecret: decryptWooCommerceSecret(connection.consumerSecret),
  });

  let updated = 0;
  let skipped = 0;

  for (const productId of uniqueProductIds) {
    try {
      const product = await client.request<WooCommerceProduct>(`products/${productId}`);
      const variations = product.variations?.length
        ? await client.request<WooCommerceVariation[]>(
            `products/${product.id}/variations?per_page=100`
          )
        : [];
      const stock = getProductStock(product, variations);
      const variants = getVariantMetadata(variations);

      const result = await prisma.product.updateMany({
        where: {
          sellerId: connection.userId,
          wooCommerceStoreUrl: connection.storeUrl,
          wooCommerceProductId: String(product.id),
        },
        data: {
          stock,
          isActive: product.status === "publish",
          wooCommerceVariants: variants.length ? variants : Prisma.JsonNull,
        },
      });

      updated += result.count;
    } catch (error) {
      console.error("WooCommerce stock sync failed", {
        storeUrl: connection.storeUrl,
        productId,
        error,
      });
      skipped += 1;
    }
  }

  if (updated > 0) {
    revalidateTag("products", "max");
    revalidateTag("campaigns", "max");
    revalidateTag("stores", "max");
    revalidatePath("/products");
    revalidatePath("/campaigns");
    revalidatePath("/store");
    revalidatePath("/seller/products");
  }

  return { updated, skipped };
}

export async function syncWooCommerceStockFromWebhook({
  storeUrl,
  payload,
}: {
  storeUrl: string;
  payload: unknown;
}) {
  return syncWooCommerceProductStock({
    storeUrl,
    productIds: getProductIdsFromWebhookPayload(payload),
  });
}
