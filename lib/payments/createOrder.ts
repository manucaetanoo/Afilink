import { prisma } from "@/lib/prisma";
import { calculateSplit } from "@/lib/payments/calculateSplit";
import { OrderStatus } from "@prisma/client";

type CreateOrderInput = {
  productId: string;
  affiliateCode?: string;
};

export async function createOrder({
  productId,
  affiliateCode,
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
  let clickId: string | null = null;

  if (affiliateCode) {
    const link = await prisma.affiliateLink.findUnique({
      where: { code: affiliateCode },
    });

    if (link && link.productId === product.id) {
      affiliateId = link.affiliateId;

      const click = await prisma.click.create({
        data: {
          linkId: link.id,
        },
      });

      clickId = click.id;
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

  const order = await prisma.order.create({
    data: {
      productId: product.id,
      sellerId: product.sellerId,
      affiliateId,
      total: product.price,
      status: OrderStatus.PENDING,
      clickId,

      commissionValue: product.commissionValue,
      commissionType: product.commissionType,
      affiliateAmount: split.affiliateAmount,

      platformCommissionValue: product.platformCommissionValue,
      platformCommissionType: product.platformCommissionType,
      platformAmount: split.platformAmount,

      sellerAmount: split.sellerAmount,
      paymentProvider: "mercadopago",
    },
  });

  return order;
}