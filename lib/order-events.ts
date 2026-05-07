import {
  CommissionStatus,
  OrderStatus,
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
        items: {
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

    const items = order.items;
    const effectiveBuyerEmail = buyerEmail ?? order.buyerEmail;
    const shippingAddress = [
      order.shippingStreet && order.shippingNumber
        ? `${order.shippingStreet} ${order.shippingNumber}`
        : order.shippingStreet,
      order.shippingApartment,
      order.shippingCity,
      order.shippingState,
      order.shippingPostalCode,
      order.shippingCountry,
    ]
      .filter(Boolean)
      .join(", ");

    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paymentStatus,
        paymentProvider: paymentProvider ?? order.paymentProvider ?? "dlocalgo",
        paymentId: paymentId ?? order.paymentId ?? `pay_${order.id}`,
      },
    });

    const stockByProduct = new Map<string, { name: string; quantity: number }>();

    for (const item of items) {
      const current = stockByProduct.get(item.product.id) ?? {
        name: item.product.name,
        quantity: 0,
      };

      current.quantity += item.quantity;
      stockByProduct.set(item.product.id, current);
    }

    for (const [productId, item] of stockByProduct) {
      const updated = await tx.product.updateMany({
        where: {
          id: productId,
          stock: {
            gte: item.quantity,
          },
        },
        data: {
          stock: {
            decrement: item.quantity,
          },
        },
      });

      if (updated.count !== 1) {
        throw new Error(`Stock insuficiente para ${item.name}`);
      }
    }

    for (const item of items) {
      if (item.affiliateId && item.affiliateAmount > 0) {
        if (!item.commission) {
          await tx.commission.create({
            data: {
              orderId: order.id,
              orderItemId: item.id,
              affiliateId: item.affiliateId,
              amount: item.affiliateAmount,
              status: CommissionStatus.APPROVED,
            },
          });
        } else {
          await tx.commission.update({
            where: { id: item.commission.id },
            data: { status: CommissionStatus.APPROVED },
          });
        }
      }
    }

    await tx.commission.updateMany({
      where: { orderId: order.id },
      data: { status: CommissionStatus.APPROVED },
    });

    const sellerTotals = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string | null;
        total: number;
        net: number;
        products: string[];
      }
    >();
    const affiliateTotals = new Map<
      string,
      {
        id: string;
        name: string | null;
        email: string | null;
        amount: number;
        products: string[];
      }
    >();

    for (const item of items) {
      const seller = sellerTotals.get(item.seller.id) ?? {
        id: item.seller.id,
        name: item.seller.name,
        email: item.seller.email,
        total: 0,
        net: 0,
        products: [],
      };
      seller.total += item.total;
      seller.net += item.sellerAmount;
      seller.products.push(item.product.name);
      sellerTotals.set(item.seller.id, seller);

      if (item.affiliate?.id && item.affiliateAmount > 0) {
        const affiliate = affiliateTotals.get(item.affiliate.id) ?? {
          id: item.affiliate.id,
          name: item.affiliate.name,
          email: item.affiliate.email,
          amount: 0,
          products: [],
        };
        affiliate.amount += item.affiliateAmount;
        affiliate.products.push(item.product.name);
        affiliateTotals.set(item.affiliate.id, affiliate);
      }
    }

    const notifications = [
      ...Array.from(sellerTotals.values()).map((seller) => ({
        userId: seller.id,
        type: "ORDER_PAID",
        title: "Venta confirmada",
        message: `Se confirmo una venta por ${formatMoney(seller.total)}.`,
        orderId: order.id,
      })),
      ...Array.from(affiliateTotals.values()).map((affiliate) => ({
        userId: affiliate.id,
        type: "AFFILIATE_COMMISSION_APPROVED",
        title: "Comision generada",
        message: `Tu link genero ${formatMoney(affiliate.amount)} en comisiones.`,
        orderId: order.id,
      })),
    ];

    if (notifications.length) {
      await tx.notification.createMany({
        data: notifications,
      });
    }

    return {
      alreadyPaid: false,
      order: {
        id: order.id,
        total: order.total,
        buyerEmail: effectiveBuyerEmail,
        buyerName: order.buyerName,
        buyerPhone: order.buyerPhone,
        shippingAddress,
        shippingNotes: order.shippingNotes,
        sellers: Array.from(sellerTotals.values()),
        affiliates: Array.from(affiliateTotals.values()),
        productNames: items.map((item) => item.product.name),
      },
    };
  });

  if (result.alreadyPaid || !result.order) {
    return result;
  }

  const baseUrl = getBaseUrl();
  const orderUrl = `${baseUrl}/orders/${result.order.id}/success`;
  const emailJobs: Promise<unknown>[] = [];
  const productList = result.order.productNames.join(", ");

  if (result.order.buyerEmail) {
    emailJobs.push(
      sendTransactionalEmail({
        to: result.order.buyerEmail,
        subject: "Tu compra fue confirmada",
        html: `
          <h1>Compra confirmada</h1>
          <p>Tu compra de <strong>${productList}</strong> fue aprobada.</p>
          <p>Total: <strong>${formatMoney(result.order.total)}</strong></p>
          <p>Puedes revisar el detalle aqui: <a href="${orderUrl}">${orderUrl}</a></p>
        `,
        text: `Tu compra de ${productList} fue aprobada. Total: ${formatMoney(result.order.total)}. Detalle: ${orderUrl}`,
      })
    );
  }

  for (const seller of result.order.sellers) {
    if (!seller.email) continue;

    emailJobs.push(
      sendTransactionalEmail({
        to: seller.email,
        subject: "Nueva venta confirmada",
        html: `
          <h1>Venta confirmada</h1>
          <p>Se aprobo una venta de <strong>${seller.products.join(", ")}</strong>.</p>
          <p>Total cobrado para tus productos: <strong>${formatMoney(seller.total)}</strong></p>
          <p>Importe para el vendedor: <strong>${formatMoney(seller.net)}</strong></p>
          <p>Entrega: <strong>${result.order.shippingAddress}</strong></p>
          <p>Cliente: <strong>${result.order.buyerName ?? "Sin nombre"} - ${result.order.buyerPhone ?? "Sin telefono"}</strong></p>
          ${result.order.shippingNotes ? `<p>Indicaciones: ${result.order.shippingNotes}</p>` : ""}
        `,
        text: `Se aprobo una venta de ${seller.products.join(", ")}. Total: ${formatMoney(seller.total)}. Neto vendedor: ${formatMoney(seller.net)}. Entrega: ${result.order.shippingAddress}. Cliente: ${result.order.buyerName ?? "Sin nombre"} - ${result.order.buyerPhone ?? "Sin telefono"}.`,
      })
    );
  }

  for (const affiliate of result.order.affiliates) {
    if (!affiliate.email) continue;

    emailJobs.push(
      sendTransactionalEmail({
        to: affiliate.email,
        subject: "Generaste una comision",
        html: `
          <h1>Comision generada</h1>
          <p>Tu recomendacion cerro una venta de <strong>${affiliate.products.join(", ")}</strong>.</p>
          <p>Tu comision aprobada es de <strong>${formatMoney(affiliate.amount)}</strong>.</p>
        `,
        text: `Tu recomendacion cerro una venta de ${affiliate.products.join(", ")}. Comision aprobada: ${formatMoney(affiliate.amount)}.`,
      })
    );
  }

  await Promise.allSettled(emailJobs);

  return result;
}
