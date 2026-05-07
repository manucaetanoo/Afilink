import { prisma } from "@/lib/prisma";
import { calculateSplit } from "@/lib/payments/calculateSplit";
import { getCheckoutTotalWithTax } from "@/lib/taxes";
import {
  OrderStatus,
  CommissionStatus,
  SettlementStatus,
  type Product,
} from "@prisma/client";

type CheckoutItemInput = {
  productId: string;
  quantity?: number;
  selectedSize?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

type CreateOrderInput = {
  productId: string;
  selectedSize?: string | null;
  clickId?: string;
  campaignClickId?: string;
};

type ResolvedOrderItem = {
  product: Product;
  quantity: number;
  selectedSize: string | null;
  affiliateId: string | null;
  campaignId: string | null;
  clickId: string | null;
  campaignClickId: string | null;
  total: number;
  affiliateAmount: number;
  platformAmount: number;
  sellerAmount: number;
};

async function resolveAttribution({
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
    });

    if (!product) {
      throw new Error("Producto no encontrado");
    }

    if (!product.isActive) {
      throw new Error("Producto inactivo");
    }

    if (product.stock < quantity) {
      throw new Error(`Stock insuficiente para ${product.name}`);
    }

    const selectedSize = item.selectedSize?.trim() || null;

    if (product.sizes.length > 0) {
      if (!selectedSize) {
        throw new Error(`Selecciona un talle para ${product.name}`);
      }

      if (!product.sizes.includes(selectedSize)) {
        throw new Error(`Talle invalido para ${product.name}`);
      }
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
      platformValue: product.platformCommissionValue,
      platformType: product.platformCommissionType,
      hasAffiliate: !!attribution.affiliateId,
    });

    resolved.push({
      product,
      quantity,
      selectedSize: product.sizes.length > 0 ? selectedSize : null,
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

  const quantitiesByProduct = new Map<string, { name: string; stock: number; quantity: number }>();

  for (const item of resolved) {
    const current = quantitiesByProduct.get(item.product.id) ?? {
      name: item.product.name,
      stock: item.product.stock,
      quantity: 0,
    };

    current.quantity += item.quantity;
    quantitiesByProduct.set(item.product.id, current);
  }

  for (const item of quantitiesByProduct.values()) {
    if (item.stock < item.quantity) {
      throw new Error(`Stock insuficiente para ${item.name}`);
    }
  }

  return resolved;
}

export async function createCheckoutOrder(items: CheckoutItemInput[]) {
  const resolvedItems = await resolveCheckoutItems(items);
  const first = resolvedItems[0];
  const subtotal = resolvedItems.reduce((sum, item) => sum + item.total, 0);
  const { total } = getCheckoutTotalWithTax(subtotal);
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

  return prisma.$transaction(async (tx) => {
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

        platformCommissionValue: first.product.platformCommissionValue,
        platformCommissionType: first.product.platformCommissionType,
        platformAmount,

        sellerAmount,
        paymentProvider: "dlocalgo",
        paymentStatus: "pending",
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
          unitPrice: item.product.price,
          total: item.total,
          commissionValue: item.product.commissionValue,
          commissionType: "PERCENT",
          affiliateAmount: item.affiliateAmount,
          platformCommissionValue: item.product.platformCommissionValue,
          platformCommissionType: item.product.platformCommissionType,
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
  });
}

export async function createOrder({
  productId,
  selectedSize,
  clickId,
  campaignClickId,
}: CreateOrderInput) {
  return createCheckoutOrder([{ productId, selectedSize, clickId, campaignClickId }]);
}
