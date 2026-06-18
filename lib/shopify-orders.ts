import { type Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";
import { calculateSplit } from "@/lib/payments/calculateSplit";
import { resolveAttribution } from "@/lib/payments/createOrder";

type ShopifyOrderAttribute = {
  name?: unknown;
  key?: unknown;
  value?: unknown;
};

type ShopifyOrderLineItem = {
  id?: unknown;
  product_id?: unknown;
  variant_id?: unknown;
  title?: unknown;
  variant_title?: unknown;
  quantity?: unknown;
  price?: unknown;
};

export type ShopifyPaidOrderPayload = {
  id?: unknown;
  name?: unknown;
  email?: unknown;
  contact_email?: unknown;
  currency?: unknown;
  total_price?: unknown;
  note_attributes?: ShopifyOrderAttribute[];
  line_items?: ShopifyOrderLineItem[];
  customer?: {
    first_name?: unknown;
    last_name?: unknown;
    email?: unknown;
    phone?: unknown;
  } | null;
  shipping_address?: {
    name?: unknown;
    first_name?: unknown;
    last_name?: unknown;
    phone?: unknown;
    address1?: unknown;
    address2?: unknown;
    city?: unknown;
    province?: unknown;
    zip?: unknown;
    country_code?: unknown;
  } | null;
};

function cleanString(value: unknown, max = 191) {
  const text = typeof value === "string" ? value.trim() : "";
  return text ? text.slice(0, max) : null;
}

function asPositiveInteger(value: unknown, fallback = 1) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.max(1, Math.round(parsed));
}

function moneyToInteger(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) return 0;
  return Math.round(parsed);
}

function getAttributes(payload: ShopifyPaidOrderPayload) {
  const attrs = new Map<string, string>();

  for (const attr of payload.note_attributes ?? []) {
    const key = cleanString(attr.name ?? attr.key, 120);
    const value = cleanString(attr.value, 500);
    if (key && value) attrs.set(key, value);
  }

  return attrs;
}

function getBuyerName(payload: ShopifyPaidOrderPayload) {
  const shippingName = cleanString(payload.shipping_address?.name, 140);
  if (shippingName) return shippingName;

  const parts = [
    cleanString(payload.customer?.first_name, 70),
    cleanString(payload.customer?.last_name, 70),
  ].filter(Boolean);

  return parts.join(" ").trim() || null;
}

function getSelectedSize(lineItem: ShopifyOrderLineItem) {
  return cleanString(lineItem.variant_title, 30);
}

async function findProductForLineItem({
  shopDomain,
  lineItem,
  explicitProductId,
}: {
  shopDomain: string;
  lineItem: ShopifyOrderLineItem;
  explicitProductId: string | null;
}) {
  if (explicitProductId) {
    const product = await prisma.product.findUnique({
      where: { id: explicitProductId },
      include: {
        seller: {
          select: {
            platformCommissionValue: true,
            platformCommissionType: true,
          },
        },
      },
    });

    if (product?.shopifyShopDomain === shopDomain) return product;
  }

  const variantId = cleanString(lineItem.variant_id, 80);
  if (!variantId) return null;

  return prisma.product.findFirst({
    where: {
      shopifyShopDomain: shopDomain,
      shopifyVariantId: variantId,
    },
    include: {
      seller: {
        select: {
          platformCommissionValue: true,
          platformCommissionType: true,
        },
      },
    },
  });
}

export async function processShopifyPaidOrder({
  shopDomain,
  payload,
}: {
  shopDomain: string;
  payload: ShopifyPaidOrderPayload;
}) {
  const shopifyOrderId = cleanString(payload.id, 80);
  if (!shopifyOrderId) {
    throw new Error("Webhook Shopify sin order id");
  }

  const existingOrder = await prisma.order.findUnique({
    where: {
      shopifyShopDomain_shopifyOrderId: {
        shopifyShopDomain: shopDomain,
        shopifyOrderId,
      },
    },
    select: {
      id: true,
      paymentProvider: true,
    },
  });

  if (existingOrder && existingOrder.paymentProvider !== "shopify") {
    return {
      orderId: existingOrder.id,
      created: false,
      billingStatus: "IGNORED_AFILINK_CHECKOUT",
    };
  }

  const attrs = getAttributes(payload);
  const explicitProductId = attrs.get("afilink_product_id") ?? null;
  const clickId = attrs.get("afilink_click_id") ?? undefined;
  const campaignClickId = attrs.get("afilink_campaign_click_id") ?? undefined;
  const lineItems = payload.line_items ?? [];

  if (!lineItems.length) {
    throw new Error("Webhook Shopify sin productos");
  }

  if (existingOrder) {
    return { orderId: existingOrder.id, created: false, billingStatus: "DISABLED" };
  }

  const resolvedItems: Array<{
    product: NonNullable<Awaited<ReturnType<typeof findProductForLineItem>>>;
    quantity: number;
    selectedSize: string | null;
    clickId: string | null;
    campaignClickId: string | null;
    affiliateId: string | null;
    campaignId: string | null;
    total: number;
    affiliateAmount: number;
    platformAmount: number;
    sellerAmount: number;
  }> = [];

  for (const lineItem of lineItems) {
    const product = await findProductForLineItem({
      shopDomain,
      lineItem,
      explicitProductId: lineItems.length === 1 ? explicitProductId : null,
    });

    if (!product) continue;

    const quantity = asPositiveInteger(lineItem.quantity);
    const lineTotal = moneyToInteger(lineItem.price) * quantity;
    const attribution = await resolveAttribution({
      product,
      clickId,
      campaignClickId,
    });
    const split = calculateSplit({
      total: lineTotal,
      affiliateValue: product.commissionValue,
      affiliateType: "PERCENT",
      platformValue: product.seller.platformCommissionValue,
      platformType: product.seller.platformCommissionType,
      hasAffiliate: !!attribution.affiliateId,
    });

    resolvedItems.push({
      product,
      quantity,
      selectedSize: getSelectedSize(lineItem),
      ...attribution,
      total: lineTotal,
      affiliateAmount: split.affiliateAmount,
      platformAmount: split.platformAmount,
      sellerAmount: split.sellerAmount,
    });
  }

  if (!resolvedItems.length) {
    throw new Error("La orden Shopify no coincide con productos Afilink");
  }

  const first = resolvedItems[0];
  const total = resolvedItems.reduce((sum, item) => sum + item.total, 0);
  const affiliateAmount = resolvedItems.reduce(
    (sum, item) => sum + item.affiliateAmount,
    0
  );
  const platformAmount = resolvedItems.reduce(
    (sum, item) => sum + item.platformAmount,
    0
  );
  const sellerAmount = resolvedItems.reduce(
    (sum, item) => sum + item.sellerAmount,
    0
  );
  const shopifyOrderName = cleanString(payload.name, 80);

  const order = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const createdOrder = await tx.order.create({
      data: {
        productId: first.product.id,
        sellerId: first.product.sellerId,
        affiliateId: first.affiliateId,
        campaignId: first.campaignId,
        total,
        status: OrderStatus.PAID,
        clickId: first.clickId,
        campaignClickId: first.campaignClickId,
        commissionValue: first.product.commissionValue,
        commissionType: "PERCENT",
        affiliateAmount,
        platformCommissionValue: first.product.seller.platformCommissionValue,
        platformCommissionType: first.product.seller.platformCommissionType,
        platformAmount,
        sellerAmount,
        paymentProvider: "shopify",
        paymentId: shopifyOrderId,
        paymentStatus: "paid",
        shopifyShopDomain: shopDomain,
        shopifyOrderId,
        shopifyOrderName,
        buyerName: getBuyerName(payload),
        buyerEmail:
          cleanString(payload.email, 191) ??
          cleanString(payload.contact_email, 191) ??
          cleanString(payload.customer?.email, 191),
        buyerPhone:
          cleanString(payload.shipping_address?.phone, 40) ??
          cleanString(payload.customer?.phone, 40),
        shippingStreet: cleanString(payload.shipping_address?.address1, 160),
        shippingApartment: cleanString(payload.shipping_address?.address2, 60),
        shippingCity: cleanString(payload.shipping_address?.city, 120),
        shippingState: cleanString(payload.shipping_address?.province, 120),
        shippingPostalCode: cleanString(payload.shipping_address?.zip, 20),
        shippingCountry: cleanString(payload.shipping_address?.country_code, 2),
      },
    });

    for (const item of resolvedItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: createdOrder.id,
          productId: item.product.id,
          sellerId: item.product.sellerId,
          affiliateId: item.affiliateId,
          campaignId: item.campaignId,
          clickId: item.clickId,
          campaignClickId: item.campaignClickId,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          unitPrice: moneyToInteger(item.total / item.quantity),
          total: item.total,
          commissionValue: item.product.commissionValue,
          commissionType: "PERCENT",
          affiliateAmount: item.affiliateAmount,
          platformCommissionValue: item.product.seller.platformCommissionValue,
          platformCommissionType: item.product.seller.platformCommissionType,
          platformAmount: item.platformAmount,
          sellerAmount: item.sellerAmount,
        },
      });

      if (item.affiliateId && item.affiliateAmount > 0) {
        await tx.commission.create({
          data: {
            orderId: createdOrder.id,
            orderItemId: orderItem.id,
            affiliateId: item.affiliateId,
            amount: item.affiliateAmount,
            status: CommissionStatus.PENDING,
          },
        });
      }

      await tx.product.updateMany({
        where: {
          id: item.product.id,
          stock: { gte: item.quantity },
        },
        data: { stock: { decrement: item.quantity } },
      });
    }

    await tx.settlement.create({
      data: {
        orderId: createdOrder.id,
        sellerId: first.product.sellerId,
        grossAmount: total,
        platformFee: platformAmount,
        affiliateFee: affiliateAmount,
        netAmount: sellerAmount,
        status: SettlementStatus.PENDING,
      },
    });

    return createdOrder;
  });

  return { orderId: order.id, created: true, billingStatus: "DISABLED" };
}
