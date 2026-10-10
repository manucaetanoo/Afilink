import {
  CommissionStatus,
  OrderStatus,
  SettlementStatus,
} from "@/lib/prisma-enums";
import { type Prisma } from "@prisma/client";
import { sendTransactionalEmail } from "@/lib/email";
import { getProductDigitalAccessMessage } from "@/lib/product-access";
import { financialTransaction } from "@/lib/financial-transaction";
import { recordPurchaseEvent } from "@/lib/purchase-analytics";

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

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function accessInstructionsHtml(
  instructions: Array<{
    productName: string;
    message: string;
    instructions: string;
  }>
) {
  if (instructions.length === 0) return "";

  return `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px;margin:20px 0;">
            <p style="margin:0 0 12px;color:#9a3412;font-size:13px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">
              Instrucciones de acceso
            </p>
            ${instructions
              .map(
                (item) => `
                  <div style="margin-top:14px;padding-top:14px;border-top:1px solid #fed7aa;">
                    <p style="margin:0 0 8px;font-size:15px;font-weight:800;color:#111827;">
                      ${escapeHtml(item.productName)}
                    </p>
                    <p style="margin:0 0 8px;font-size:14px;line-height:1.7;font-weight:700;color:#431407;">
                      ${escapeHtml(item.message)}.
                    </p>
                    <p style="margin:0;white-space:pre-line;font-size:14px;line-height:1.7;color:#431407;">
                      ${escapeHtml(item.instructions)}
                    </p>
                  </div>
                `
              )
              .join("")}
          </div>
  `;
}

export async function markOrderPaidAndNotify({
  orderId,
  buyerEmail,
  paymentId,
  paymentProvider,
  paymentStatus = "approved",
}: MarkOrderPaidInput) {
  const result = await financialTransaction(async (tx: Prisma.TransactionClient) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                digitalAccessInstructions: true,
                digitalAccessType: true,
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

    if (["refunded", "charged_back", "canceled"].includes(order.paymentStatus?.toLowerCase() ?? "")) {
      throw new Error("El pago de esta orden fue revertido");
    }

    const items = order.items;
    const effectiveBuyerEmail = buyerEmail ?? order.buyerEmail;
    await tx.order.update({
      where: { id: order.id },
      data: {
        status: OrderStatus.PAID,
        paidAt: new Date(),
        paymentStatus,
        paymentProvider: paymentProvider ?? order.paymentProvider ?? "mercadopago",
        paymentId: paymentId ?? order.paymentId ?? `pay_${order.id}`,
      },
    });

    await recordPurchaseEvent({ name: "purchase_approved", eventKey: `order:${order.id}:approved`, orderId: order.id, sessionId: order.sessionId, productId: order.productId }, tx);

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

    await tx.settlement.updateMany({
      where: { orderId: order.id },
      data: {
        status: SettlementStatus.AVAILABLE,
        fulfillmentStatus: "DELIVERED",
        deliveredAt: new Date(),
      },
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
        shippingNotes: order.shippingNotes,
        sellers: Array.from(sellerTotals.values()),
        affiliates: Array.from(affiliateTotals.values()),
        productNames: items.map((item) => item.product.name),
        accessInstructions: items
          .map((item) => ({
            productName: item.product.name,
            message: getProductDigitalAccessMessage(
              item.product.digitalAccessType
            ),
            instructions: item.product.digitalAccessInstructions?.trim() ?? "",
          }))
      },
    };
  });

  if (result.alreadyPaid || !result.order) {
    return result;
  }

  const baseUrl = getBaseUrl();
  const orderUrl = `${baseUrl}/pedido/${result.order.id}/`;
  const emailJobs: Promise<unknown>[] = [];
  const productList = result.order.productNames.join(", ");
  const accessHtml = accessInstructionsHtml(result.order.accessInstructions);
  const accessText = result.order.accessInstructions
    .map((item) =>
      `${item.productName}: ${item.message}.${item.instructions ? `\n${item.instructions}` : ""}`
    )
    .join("\n\n");

  if (result.order.buyerEmail) {
    emailJobs.push(
      sendTransactionalEmail({
        to: result.order.buyerEmail,
        subject: "Tu compra fue confirmada",
       html: `
  <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
      
      <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
        
        <div style="background:#111827;padding:28px 24px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
            Compra confirmada
          </h1>
          <p style="margin:8px 0 0;color:#d1d5db;font-size:15px;">
            Tu pedido fue aprobado correctamente
          </p>
        </div>

        <div style="padding:28px 24px;">
          <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Hola, recibimos la confirmación de pago de tu compra.
          </p>

          <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:14px;padding:18px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#6b7280;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">
              Productos
            </p>
            <p style="margin:0;font-size:16px;font-weight:700;color:#111827;">
              ${productList}
            </p>
          </div>

          <div style="background:#ecfdf5;border:1px solid #bbf7d0;border-radius:14px;padding:18px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#047857;font-size:13px;text-transform:uppercase;letter-spacing:.04em;">
              Total pagado
            </p>
            <p style="margin:0;font-size:24px;font-weight:800;color:#065f46;">
              ${formatMoney(result.order.total)}
            </p>
          </div>

          ${accessHtml || `
          <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:14px;padding:18px;margin:20px 0;">
            <p style="margin:0 0 8px;color:#9a3412;font-size:13px;text-transform:uppercase;letter-spacing:.04em;font-weight:700;">
              Acceso digital
            </p>
            <p style="margin:0;font-size:14px;line-height:1.7;color:#431407;">
              El vendedor va a coordinar el acceso usando los datos de contacto de la compra.
            </p>
          </div>
          `}

          <p style="margin:20px 0;font-size:15px;line-height:1.6;color:#374151;">
            Puedes revisar el detalle de tu compra desde el siguiente botón:
          </p>

          <div style="text-align:center;margin:28px 0;">
            <a href="${orderUrl}" 
              style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;
              padding:14px 24px;border-radius:12px;font-size:15px;font-weight:700;">
              Ver detalle del pedido
            </a>
          </div>

          <p style="margin:0;font-size:13px;line-height:1.6;color:#6b7280;">
            Si el botón no funciona, copia y pega este enlace en tu navegador:<br />
            <a href="${orderUrl}" style="color:#2563eb;text-decoration:none;">
              ${orderUrl}
            </a>
          </p>
        </div>

        <div style="background:#f9fafb;padding:18px 24px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;color:#6b7280;font-size:12px;">
            Gracias por comprar en nuestra plataforma.
          </p>
        </div>

      </div>
    </div>
  </div>
`,
        text: `Tu compra de ${productList} fue aprobada. Total: ${formatMoney(result.order.total)}.${accessText ? `\n\nAcceso:\n${accessText}` : ""}\n\nDetalle: ${orderUrl}`,
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
        <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
      
      <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
        
        <div style="background:#111827;padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
            Nueva venta confirmada
          </h1>

<p style="margin:8px 0 0;color:#d1d5db;font-size:15px;">
  Se registró una nueva orden para tu tienda.
</p>
</div>

<!-- BODY -->
<div style="padding:28px;">
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3f3f46;">
    Una compra de tus productos fue aprobada correctamente. A continuación tienes el detalle de la operación.
  </p>

  <!-- RESUMEN ECONOMICO -->
  <div style="border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:14px 18px;background:#fafafa;border-bottom:1px solid #e4e4e7;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:.04em;">
        Resumen de la venta
      </p>
    </div>
    <div style="padding:18px;">
      <div style="display:flex;justify-content:space-between;gap:16px;padding-bottom:14px;border-bottom:1px solid #eeeeee;">
        <span style="font-size:14px;color:#71717a;">Total cobrado </span>
        <strong style="font-size:15px;color:#18181b;">${formatMoney(seller.total)}</strong>
      </div>
      <div style="display:flex;justify-content:space-between;gap:16px;padding-top:14px;">
        <span style="font-size:14px;color:#71717a;">Importe para el vendedor </span>
        <strong style="font-size:18px;color:#18181b;">${formatMoney(seller.net)}</strong>
      </div>
    </div>
  </div>

  <!-- PRODUCTOS -->
  <div style="border:1px solid #e4e4e7;border-radius:14px;padding:18px;margin-bottom:24px;">
    <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:.04em;">
      Productos vendidos
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#18181b;font-weight:600;">
      ${seller.products.join(", ")}
    </p>
  </div>

  <!-- CLIENTE -->
  <div style="border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;">
    <div style="padding:14px 18px;background:#fafafa;border-bottom:1px solid #e4e4e7;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:.04em;">
        Datos del comprador
      </p>
    </div>
    <div style="padding:18px;">
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#18181b;">
        <strong>Cliente:</strong> ${result.order.buyerName ?? "Sin nombre"}
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#18181b;">
        <strong>Email:</strong> ${result.order.buyerEmail ?? "Sin email"}
      </p>
      <p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#18181b;">
        <strong>Teléfono:</strong> ${result.order.buyerPhone ?? "Sin teléfono"}
      </p>
      ${ result.order.shippingNotes ? `
        <div style="margin-top:16px;padding-top:16px;border-top:1px solid #eeeeee;">
          <p style="margin:0 0 6px;font-size:14px;font-weight:700;color:#52525b;">
            Indicaciones de acceso
          </p>
          <p style="margin:0;font-size:15px;line-height:1.6;color:#18181b;">
            ${result.order.shippingNotes}
          </p>
        </div>
      ` : "" }
    </div>
  </div>
</div>

<!-- FOOTER -->
<div style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
  <p style="margin:0;color:#71717a;font-size:12px;line-height:1.6;">
    Esta notificación corresponde a una venta procesada por Afilink.
  </p>
</div>
</div>
</div>
</div>

            `,
        text: `Se aprobo una venta de ${seller.products.join(", ")}. Total: ${formatMoney(seller.total)}. Neto vendedor: ${formatMoney(seller.net)}. Cliente: ${result.order.buyerName ?? "Sin nombre"}. Email: ${result.order.buyerEmail ?? "Sin email"}. Telefono: ${result.order.buyerPhone ?? "Sin telefono"}.`,
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
                  <div style="margin:0;padding:0;background:#f6f7fb;font-family:Arial,Helvetica,sans-serif;color:#111827;">
    <div style="max-width:620px;margin:0 auto;padding:32px 16px;">
      
      <div style="background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb;">
        
        <div style="background:#111827;padding:28px 24px;text-align:center;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;">
            Nueva comisión confirmada
          </h1>

<p style="margin:8px 0 0;color:#d1d5db;font-size:15px;">
  Tu recomendacion generó una venta.
</p>
</div>

<!-- BODY -->
<div style="padding:28px;">
  <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#3f3f46;">
    Se aprobó una compra realizada desde uno de tus enlaces de afiliado.
  </p>

  <!-- COMISION -->
  <div style="border:1px solid #e4e4e7;border-radius:14px;overflow:hidden;margin-bottom:24px;">
    <div style="padding:14px 18px;background:#fafafa;border-bottom:1px solid #e4e4e7;">
      <p style="margin:0;font-size:13px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:.04em;">
        Comisión aprobada
      </p>
    </div>
    <div style="padding:24px 18px;text-align:center;">
      <p style="margin:0;font-size:34px;font-weight:800;color:#18181b;letter-spacing:-0.03em;">
        ${formatMoney(affiliate.amount)}
      </p>
    </div>
  </div>

  <!-- PRODUCTOS -->
  <div style="border:1px solid #e4e4e7;border-radius:14px;padding:18px;">
    <p style="margin:0 0 10px;font-size:13px;font-weight:700;color:#52525b;text-transform:uppercase;letter-spacing:.04em;">
      Productos vendidos
    </p>
    <p style="margin:0;font-size:15px;line-height:1.7;color:#18181b;font-weight:600;">
      ${affiliate.products.join(", ")}
    </p>
  </div>

  <!-- INFO -->
  <div style="margin-top:24px;">
    <p style="margin:0;font-size:14px;line-height:1.7;color:#71717a;">
      Tu comisión ya está disponible para solicitar el cobro desde tu dashboard.
    </p>
  </div>
</div>

<!-- FOOTER -->
<div style="padding:18px 28px;background:#fafafa;border-top:1px solid #e4e4e7;text-align:center;">
  <p style="margin:0;font-size:12px;line-height:1.6;color:#71717a;">
    Esta notificación corresponde a una comisión registrada en Afilink.
  </p>
</div>
</div>
</div>
</div>

        `,
        text: `Tu recomendacion cerro una venta de ${affiliate.products.join(", ")}. Comision aprobada: ${formatMoney(affiliate.amount)}.`,
      })
    );
  }

  await Promise.allSettled(emailJobs);

  return result;
}
