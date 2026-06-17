import { prisma } from "@/lib/prisma";
import {
  createWooCommerceClient,
  decryptWooCommerceSecret,
} from "@/lib/woocommerce";

type WooCommerceVariantMetadata = {
  id?: unknown;
  attributes?: Array<{
    name?: unknown;
    option?: unknown;
  }>;
};

function getWooCommerceVariationId({
  fallbackVariationId,
  variants,
  selectedSize,
  selectedColor,
}: {
  fallbackVariationId: string | null;
  variants: unknown;
  selectedSize?: string | null;
  selectedColor?: string | null;
}) {
  const selectedOptions = [selectedSize, selectedColor]
    .map((value) => value?.trim().toUpperCase())
    .filter((value): value is string => Boolean(value));

  if (selectedOptions.length && Array.isArray(variants)) {
    const matchedVariant = variants.find((variant): variant is WooCommerceVariantMetadata => {
      if (!variant || typeof variant !== "object") return false;
      if (!Array.isArray((variant as WooCommerceVariantMetadata).attributes)) return false;

      const options = (variant as WooCommerceVariantMetadata).attributes
        ?.map((attribute) =>
          typeof attribute.option === "string"
            ? attribute.option.trim().toUpperCase()
            : null
        )
        .filter(Boolean);

      return selectedOptions.every((selectedOption) =>
        options?.includes(selectedOption)
      );
    });

    const matchedId = matchedVariant?.id;
    if (typeof matchedId === "string" && matchedId.trim()) return matchedId.trim();
    if (typeof matchedId === "number" && Number.isFinite(matchedId)) {
      return String(matchedId);
    }
  }

  return fallbackVariationId?.trim() || null;
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

export async function syncWooCommerceOrder(orderId: string) {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: {
        include: {
          product: {
            select: {
              id: true,
              name: true,
              wooCommerceStoreUrl: true,
              wooCommerceProductId: true,
              wooCommerceVariationId: true,
              wooCommerceVariants: true,
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
    if (!item.product.wooCommerceStoreUrl || !item.product.wooCommerceProductId) {
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
    const existingSync = await prisma.externalOrderSync.upsert({
      where: {
        orderId_sellerId_channel: {
          orderId,
          sellerId,
          channel: "woocommerce",
        },
      },
      create: {
        orderId,
        sellerId,
        channel: "woocommerce",
        externalStoreUrl: items[0].product.wooCommerceStoreUrl,
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
      const connection = await prisma.wooCommerceConnection.findUnique({
        where: { userId: sellerId },
        select: {
          storeUrl: true,
          consumerKey: true,
          consumerSecret: true,
        },
      });

      if (!connection) {
        throw new Error("El vendedor no tiene WooCommerce conectado");
      }

      const storeUrl = items[0].product.wooCommerceStoreUrl;
      if (storeUrl !== connection.storeUrl) {
        throw new Error("La tienda WooCommerce del producto no coincide con la conexion");
      }

      const client = createWooCommerceClient({
        storeUrl: connection.storeUrl,
        consumerKey: decryptWooCommerceSecret(connection.consumerKey),
        consumerSecret: decryptWooCommerceSecret(connection.consumerSecret),
      });

      const payload = cleanUndefined({
        status: "processing",
        set_paid: true,
        payment_method: "afilink",
        payment_method_title: "Afilink",
        customer_note: order.shippingNotes || undefined,
        billing: {
          first_name: order.buyerName || undefined,
          email: order.buyerEmail || undefined,
          phone: order.buyerPhone || undefined,
          address_1: [
            order.shippingStreet,
            order.shippingNumber,
            order.shippingApartment,
          ]
            .filter(Boolean)
            .join(" "),
          city: order.shippingCity || undefined,
          state: order.shippingState || undefined,
          postcode: order.shippingPostalCode || undefined,
          country: order.shippingCountry || "UY",
        },
        shipping: {
          first_name: order.buyerName || undefined,
          address_1: [
            order.shippingStreet,
            order.shippingNumber,
            order.shippingApartment,
          ]
            .filter(Boolean)
            .join(" "),
          city: order.shippingCity || undefined,
          state: order.shippingState || undefined,
          postcode: order.shippingPostalCode || undefined,
          country: order.shippingCountry || "UY",
        },
        line_items: items.map((item) => {
          const variationId = getWooCommerceVariationId({
            fallbackVariationId: item.product.wooCommerceVariationId,
            variants: item.product.wooCommerceVariants,
            selectedSize: item.selectedSize,
            selectedColor: item.selectedColor,
          });

          return {
            product_id: Number(item.product.wooCommerceProductId),
            variation_id: variationId ? Number(variationId) : undefined,
            quantity: item.quantity,
            meta_data: [
              { key: "afilink_order_id", value: order.id },
              { key: "afilink_order_item_id", value: item.id },
              item.selectedSize
                ? { key: "afilink_selected_size", value: item.selectedSize }
                : undefined,
              item.selectedColor
                ? { key: "afilink_selected_color", value: item.selectedColor }
                : undefined,
            ],
          };
        }),
        meta_data: [
          { key: "afilink_order_id", value: order.id },
          { key: "afilink_sync_source", value: "afilink_checkout" },
        ],
      });

      const wooOrder = await client.request<{ id: number }>("orders", {
        method: "POST",
        body: payload,
      });

      await prisma.externalOrderSync.update({
        where: { id: existingSync.id },
        data: {
          externalStoreUrl: client.storeUrl,
          externalOrderId: String(wooOrder.id),
          status: "SYNCED",
          error: null,
          lastAttemptAt: new Date(),
          syncedAt: new Date(),
        },
      });

      results.push({
        sellerId,
        status: "SYNCED",
        externalOrderId: String(wooOrder.id),
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo sincronizar WooCommerce";

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

