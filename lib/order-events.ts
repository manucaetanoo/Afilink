import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
} from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { sendTransactionalEmail } from "@/lib/email";

type MarkOrderPaidInput = {
  orderId: string;
  buyerEmail?: string | null;
  paymentId?: string | null;
  paymentProvider?: string | null;
  paymentStatus?: string | null;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getBaseUrl() {
  return (
    process.env.APP_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

export async function markOrderPaidAndNotify({
  orderId,
  buyerEmail,
  paymentId,
  paymentProvider,
  paymentStatus = "approved",
}: MarkOrderPaidInput) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
          },
        },
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            storeSlug: true,
          },
        },
        affiliate: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        commission: {
          select: {
            id: true,
          },
        },
        settlement: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!order) {
      throw new Error("Orden no encontrada");
    }

    if (order.status === OrderStatus.PAID) {
      return { alreadyPaid: true, order: null };
    }

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentStatus,
        paymentProvider: paymentProvider ?? order.paymentProvider ?? "mercadopago",
        paymentId: paymentId ?? order.paymentId ?? `pay_${order.id}`,
      },
    });

    if (order.affiliateId && order.affiliateAmount > 0) {
      if (!order.commission) {
        await tx.commission.create({
          data: {
            orderId: order.id,
            affiliateId: order.affiliateId,
            amount: order.affiliateAmount,
            status: CommissionStatus.APPROVED,
          },
        });
      } else {
        await tx.commission.updateMany({
          where: { orderId: order.id },
          data: { status: CommissionStatus.APPROVED },
        });
      }
    }

    if (!order.settlement) {
      await tx.settlement.create({
        data: {
          orderId: order.id,
          sellerId: order.sellerId,
          grossAmount: order.total,
          platformFee: order.platformAmount,
          affiliateFee: order.affiliateAmount,
          netAmount: order.sellerAmount,
          status: SettlementStatus.AVAILABLE,
        },
      });
    } else {
      await tx.settlement.updateMany({
        where: { orderId: order.id },
        data: { status: SettlementStatus.AVAILABLE },
      });
    }

    const notifications = [
      {
        userId: order.seller.id,
        type: "ORDER_PAID",
        title: "Venta confirmada",
        message: `Se confirmo una venta de ${order.product.name} por ${formatMoney(order.total)}.`,
        orderId: order.id,
      },
    ];

    if (order.affiliate?.id && order.affiliateAmount > 0) {
      notifications.push({
        userId: order.affiliate.id,
        type: "AFFILIATE_COMMISSION_APPROVED",
        title: "Comision generada",
        message: `Tu link genero una comision de ${formatMoney(order.affiliateAmount)} en ${order.product.name}.`,
        orderId: order.id,
      });
    }

    await tx.notification.createMany({
      data: notifications,
    });

    return {
      alreadyPaid: false,
      order: {
        id: order.id,
        total: order.total,
        affiliateAmount: order.affiliateAmount,
        sellerAmount: order.sellerAmount,
        productName: order.product.name,
        seller: order.seller,
        affiliate: order.affiliate,
        buyerEmail,
      },
    };
  });

  if (result.alreadyPaid || !result.order) {
    return result;
  }

  const baseUrl = getBaseUrl();
  const orderUrl = `${baseUrl}/orders/${result.order.id}/success`;
  const emailJobs: Promise<unknown>[] = [];

  if (result.order.buyerEmail) {
    emailJobs.push(
      sendTransactionalEmail({
        to: result.order.buyerEmail,
        subject: "Tu compra fue confirmada",
        html: `
          <h1>Compra confirmada</h1>
          <p>Tu compra de <strong>${result.order.productName}</strong> fue aprobada.</p>
          <p>Total: <strong>${formatMoney(result.order.total)}</strong></p>
          <p>Puedes revisar el detalle aqui: <a href="${orderUrl}">${orderUrl}</a></p>
        `,
        text: `Tu compra de ${result.order.productName} fue aprobada. Total: ${formatMoney(result.order.total)}. Detalle: ${orderUrl}`,
      })
    );
  }

  if (result.order.seller.email) {
    emailJobs.push(
      sendTransactionalEmail({
        to: result.order.seller.email,
        subject: "Nueva venta confirmada",
        html: `
          <h1>Venta confirmada</h1>
          <p>Se aprobo una venta de <strong>${result.order.productName}</strong>.</p>
          <p>Total cobrado: <strong>${formatMoney(result.order.total)}</strong></p>
          <p>Importe para el vendedor: <strong>${formatMoney(result.order.sellerAmount)}</strong></p>
        `,
        text: `Se aprobo una venta de ${result.order.productName}. Total: ${formatMoney(result.order.total)}. Neto vendedor: ${formatMoney(result.order.sellerAmount)}.`,
      })
    );
  }

  if (result.order.affiliate?.email && result.order.affiliateAmount > 0) {
    emailJobs.push(
      sendTransactionalEmail({
        to: result.order.affiliate.email,
        subject: "Generaste una comision",
        html: `
          <h1>Comision generada</h1>
          <p>Tu recomendacion cerro una venta de <strong>${result.order.productName}</strong>.</p>
          <p>Tu comision aprobada es de <strong>${formatMoney(result.order.affiliateAmount)}</strong>.</p>
        `,
        text: `Tu recomendacion cerro una venta de ${result.order.productName}. Comision aprobada: ${formatMoney(result.order.affiliateAmount)}.`,
      })
    );
  }

  await Promise.allSettled(emailJobs);

  return result;
}
