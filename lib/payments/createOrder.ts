import { prisma } from "@/lib/prisma";
import { calculateSplit } from "@/lib/payments/calculateSplit";
import { OrderStatus, CommissionStatus, SettlementStatus } from "@prisma/client";

type CreateOrderInput = {
  productId: string;
  clickId?: string;
  campaignClickId?: string;
};

export async function createOrder({
  productId,
  clickId,
  campaignClickId,
}: CreateOrderInput) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error("Producto no encontrado");
  }

  if (!product.isActive) {
    throw new Error("Producto inactivo");
  }

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

      const sameSeller =
        campaignClick.link.campaign.sellerId === product.sellerId;

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

  const split = calculateSplit({
    total: product.price,
    affiliateValue: product.commissionValue,
    affiliateType: product.commissionType,
    platformValue: product.platformCommissionValue,
    platformType: product.platformCommissionType,
    hasAffiliate: !!affiliateId,
  });

  const order = await prisma.$transaction(async (tx) => {
    const createdOrder = await tx.order.create({
      data: {
        productId: product.id,
        sellerId: product.sellerId,
        affiliateId,
        campaignId,
        total: product.price,
        status: OrderStatus.PENDING,
        clickId: resolvedClickId,
        campaignClickId: resolvedCampaignClickId,

        commissionValue: product.commissionValue,
        commissionType: product.commissionType,
        affiliateAmount: split.affiliateAmount,

        platformCommissionValue: product.platformCommissionValue,
        platformCommissionType: product.platformCommissionType,
        platformAmount: split.platformAmount,

        sellerAmount: split.sellerAmount,
        paymentProvider: "mercadopago",
        paymentStatus: "pending",
      },
    });

    if (affiliateId && split.affiliateAmount > 0) {
      await tx.commission.create({
        data: {
          orderId: createdOrder.id,
          affiliateId,
          amount: split.affiliateAmount,
          status: CommissionStatus.PENDING,
        },
      });
    }

    await tx.settlement.create({
      data: {
        orderId: createdOrder.id,
        sellerId: product.sellerId,
        grossAmount: product.price,
        platformFee: split.platformAmount,
        affiliateFee: split.affiliateAmount,
        netAmount: split.sellerAmount,
        status: SettlementStatus.PENDING,
      },
    });

    return createdOrder;
  });

  return order;
}