import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getProductDigitalAccessMessage } from "@/lib/product-access";
import { reconcileMercadoPagoOrder } from "@/lib/payments/mercadopago";
import VerifiedPurchaseTracking from "@/components/VerifiedPurchaseTracking";

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export default async function SuccessPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const initial = await prisma.order.findUnique({ where: { id }, select: { status: true, paymentProvider: true } });
  if (initial?.status === "PENDING" && initial.paymentProvider === "mercadopago") await reconcileMercadoPagoOrder(id).catch(() => null);
  const order = await prisma.order.findUnique({
    where: { id },
    select: {
      id: true,
      productId: true,
      paidAt: true,
      paymentProvider: true,
      status: true,
      total: true,
      buyerName: true,
      buyerEmail: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          total: true,
          product: {
            select: {
              name: true,
              digitalAccessInstructions: true,
              digitalAccessType: true,
            },
          },
        },
      },
    },
  });

  if (!order) notFound();

  const isPaid = order.status === "PAID";
  const buyerFirstName = order.buyerName?.trim().split(/\s+/)[0] ?? "";

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10 text-slate-950 sm:px-6">
      {isPaid && order.paidAt && order.paymentProvider === "mercadopago" && <VerifiedPurchaseTracking orderId={order.id} productId={order.productId} total={order.total} />}
      <section className="w-full max-w-2xl bg-white px-6 py-8 text-center shadow-sm sm:px-10 sm:py-10">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-orange-500 text-orange-500">
          <CheckCircle2 className="h-9 w-9" />
        </div>

        <p className="mt-5 text-xs font-medium text-slate-600">
          {buyerFirstName ? `Hola ${buyerFirstName},` : "Gracias por tu compra,"}
        </p>
        <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
          {isPaid ? "¡Gracias por tu compra!" : "Compra recibida"}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">
          {isPaid
            ? "Abajo tenés el acceso y el resumen de tu compra. Si corresponde, también recibirás las instrucciones por email."
            : "Te avisaremos por email cuando el pago quede confirmado."}
        </p>

        <div className="mx-auto mt-5 grid max-w-sm grid-cols-2 overflow-hidden border border-slate-200 text-sm">
          <div className="border-r border-slate-200 px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Orden
            </p>
            <p className="mt-1 font-mono font-semibold">#{order.id.slice(-8)}</p>
          </div>
          <div className="px-4 py-3">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-slate-500">
              Total
            </p>
            <p className="mt-1 font-semibold">{money(order.total)}</p>
          </div>
        </div>

        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href={`/pedido/${order.id}`}
            className="inline-flex min-h-11 w-full items-center justify-center bg-orange-500 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white transition hover:bg-orange-600 sm:w-auto"
          >
            Ver detalle
          </Link>
          <Link
            href="/products"
            className="inline-flex min-h-11 w-full items-center justify-center border border-slate-200 bg-white px-5 py-3 text-sm font-bold uppercase tracking-wide text-slate-700 transition hover:bg-slate-50 sm:w-auto"
          >
            Volver a la tienda
          </Link>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6 text-left">
          <h2 className="text-sm font-bold uppercase tracking-[0.12em] text-slate-500">
            Acceso al producto
          </h2>
          <div className="mt-3 space-y-3">
            {order.items.map((item) => (
              <article key={item.id} className="bg-slate-50 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-950">
                      {item.product.name}
                    </h3>
                    <p className="mt-1 text-sm font-medium leading-6 text-orange-700">
                      {getProductDigitalAccessMessage(
                        item.product.digitalAccessType
                      )}
                      .
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-700">
                    {money(item.total)}
                  </p>
                </div>

                {isPaid && item.product.digitalAccessInstructions && (
                  <div className="mt-3 border border-orange-100 bg-white p-3 text-sm leading-6 text-slate-700">
                    <p className="whitespace-pre-line">
                      {item.product.digitalAccessInstructions}
                    </p>
                  </div>
                )}
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
