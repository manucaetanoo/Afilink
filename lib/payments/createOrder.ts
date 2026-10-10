import { prisma } from "@/lib/prisma";
import { calculateSplit } from "@/lib/payments/calculateSplit";
import { type Prisma } from "@prisma/client";
import {
  OrderStatus,
  CommissionStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";
import { type Product, type User } from "@prisma/client";

type CheckoutItemInput = {
  productId: string;
  quantity?: number;
  selectedSize?: string | null;
  selectedColor?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

type CheckoutShippingData = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingStreet?: string | null;
  shippingNumber?: string | null;
  shippingApartment?: string | null;
  shippingCity?: string | null;
  shippingState?: string | null;
  shippingPostalCode?: string | null;
  shippingCountry: string;
  shippingNotes: string | null;
};

type CreateOrderInput = {
  productId: string;
  selectedSize?: string | null;
  selectedColor?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

type ResolvedOrderItem = {
  product: Product & {
    seller: Pick<User, "platformCommissionValue" | "platformCommissionType">;
  };
  quantity: number;
  selectedSize: string | null;
  selectedColor: string | null;
  affiliateId: string | null;
  campaignId: string | null;
  clickId: string | null;
  campaignClickId: string | null;
  total: number;
  affiliateAmount: number;
  platformAmount: number;
  sellerAmount: number;
};

export async function resolveAttribution({
  product,
  clickId,
  campaignClickId,
}: {
  product: Product;
  clickId?: string;
  campaignClickId?: string;
}) {
  let affiliateId: string | null = null;
  let resolvedClickId: string | null = null;
  let campaignId: string | null = null;
  let resolvedCampaignClickId: string | null = null;

  if (campaignClickId) {
    const campaignClick = await prisma.campaignClick.findUnique({
      where: { id: campaignClickId },
      include: {
        link: {
          include: {
            campaign: true,
          },
        },
      },
    });

    if (campaignClick && campaignClick.link.campaign.isActive) {
      const now = new Date();
      const started =
        !campaignClick.link.campaign.startsAt ||
        campaignClick.link.campaign.startsAt <= now;
      const notEnded =
        !campaignClick.link.campaign.endsAt ||
        campaignClick.link.campaign.endsAt >= now;

      const campaignProduct = await prisma.campaignProduct.findUnique({
        where: {
          campaignId_productId: {
            campaignId: campaignClick.link.campaignId,
            productId: product.id,
          },
        },
      });

      const sameSeller = campaignClick.link.campaign.sellerId === product.sellerId;

      if (started && notEnded && campaignProduct && sameSeller) {
        affiliateId = campaignClick.link.affiliateId;
        campaignId = campaignClick.link.campaignId;
        resolvedCampaignClickId = campaignClick.id;
      }
    }
  }

  if (!affiliateId && clickId) {
    const click = await prisma.click.findUnique({
      where: { id: clickId },
      include: {
        link: true,
      },
    });

    if (click && click.link.productId === product.id) {
      affiliateId = click.link.affiliateId;
      resolvedClickId = click.id;
    }
  }

  return {
    affiliateId,
    campaignId,
    clickId: resolvedClickId,
    campaignClickId: resolvedCampaignClickId,
  };
}

async function resolveCheckoutItems(items: CheckoutItemInput[]) {
  const resolved: ResolvedOrderItem[] = [];

  for (const item of items) {
    const quantity = Math.max(1, Math.min(20, Number(item.quantity || 1)));
    const product = await prisma.product.findUnique({
      where: { id: item.productId },
      include: {
        seller: {
          select: {
            platformCommissionValue: true,
            platformCommissionType: true,
          },
        },
      },
    });

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    if (!product.isActive) {
      throw new Error("Producto inactivo");
    }

    const attribution = await resolveAttribution({
      product,
      clickId: item.clickId,
      campaignClickId: item.campaignClickId,
    });

    const total = product.price * quantity;
    const split = calculateSplit({
      total,
      affiliateValue: product.commissionValue,
      affiliateType: "PERCENT",
      platformValue: product.seller.platformCommissionValue,
      platformType: product.seller.platformCommissionType,
      hasAffiliate: !!attribution.affiliateId,
    });

    resolved.push({
      product,
      quantity,
      selectedSize: null,
      selectedColor: null,
      ...attribution,
      total,
      affiliateAmount: split.affiliateAmount,
      platformAmount: split.platformAmount,
      sellerAmount: split.sellerAmount,
    });
  }

  if (resolved.length === 0) {
    throw new Error("El checkout no tiene productos validos");
  }

  return resolved;
}

export async function getCheckoutDraft(items: CheckoutItemInput[]) {
  const resolvedItems = await resolveCheckoutItems(items);
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.total, 0);
  const total = subtotal;

  return {
    total,
    subtotal,
    items: resolvedItems,
  };
}

export async function createCheckoutOrder(
  items: CheckoutItemInput[],
  shippingData?: CheckoutShippingData,
  context?: { sessionId: string; checkoutKey: string }
) {
  const { total, items: resolvedItems } = await getCheckoutDraft(items);
  const first = resolvedItems[0];
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

  const sellerTotals = new Map<
    string,
    {
      grossAmount: number;
      platformFee: number;
      affiliateFee: number;
      netAmount: number;
    }
  >();

  for (const item of resolvedItems) {
    const current = sellerTotals.get(item.product.sellerId) ?? {
      grossAmount: 0,
      platformFee: 0,
      affiliateFee: 0,
      netAmount: 0,
    };

    current.grossAmount += item.total;
    current.platformFee += item.platformAmount;
    current.affiliateFee += item.affiliateAmount;
    current.netAmount += item.sellerAmount;
    sellerTotals.set(item.product.sellerId, current);
  }

  try { return await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    if (context) {
      const existing = await tx.order.findUnique({ where: { checkoutKey: context.checkoutKey } });
      if (existing) {
        if (existing.productId !== first.product.id) throw new Error("El checkout pertenece a otro producto");
        return existing;
      }
    }
    const order = await tx.order.create({
      data: {
        productId: first.product.id,
        sellerId: first.product.sellerId,
        affiliateId: first.affiliateId,
        campaignId: first.campaignId,
        total,
        status: OrderStatus.PENDING,
        clickId: first.clickId,
        campaignClickId: first.campaignClickId,

        commissionValue: first.product.commissionValue,
        commissionType: "PERCENT",
        affiliateAmount,

        platformCommissionValue: first.product.seller.platformCommissionValue,
        platformCommissionType: first.product.seller.platformCommissionType,
        platformAmount,

        sellerAmount,
        paymentProvider: "mercadopago",
        paymentStatus: "not_started",
        ...(context ?? {}),
        ...(shippingData ? shippingData : {}),
      },
    });

    for (const item of resolvedItems) {
      const orderItem = await tx.orderItem.create({
        data: {
          orderId: order.id,
          productId: item.product.id,
          sellerId: item.product.sellerId,
          affiliateId: item.affiliateId,
          campaignId: item.campaignId,
          clickId: item.clickId,
          campaignClickId: item.campaignClickId,
          quantity: item.quantity,
          selectedSize: item.selectedSize,
          selectedColor: item.selectedColor,
          unitPrice: item.product.price,
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
            orderId: order.id,
            orderItemId: orderItem.id,
            affiliateId: item.affiliateId,
            amount: item.affiliateAmount,
            status: CommissionStatus.PENDING,
          },
        });
      }
    }

    for (const [sellerId, totals] of sellerTotals) {
      await tx.settlement.create({
        data: {
          orderId: order.id,
          sellerId,
          grossAmount: totals.grossAmount,
          platformFee: totals.platformFee,
          affiliateFee: totals.affiliateFee,
          netAmount: totals.netAmount,
          status: SettlementStatus.PENDING,
        },
      });
    }

    return order;
  }); } catch (error) {
    if (context && error && typeof error === "object" && "code" in error && error.code === "P2002") {
      const existing = await prisma.order.findUnique({ where: { checkoutKey: context.checkoutKey } });
      if (existing) {
        if (existing.productId !== first.product.id) throw new Error("El checkout pertenece a otro producto");
        return existing;
      }
    }
    throw error;
  }
}

export async function createOrder({
  productId,
  selectedSize,
  selectedColor,
  clickId,
  campaignClickId,
}: CreateOrderInput) {
  return createCheckoutOrder([{ productId, selectedSize, selectedColor, clickId, campaignClickId }]);
}
