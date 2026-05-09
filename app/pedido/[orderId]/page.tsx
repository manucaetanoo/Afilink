import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  Circle,
  Clock3,
  CreditCard,
  ExternalLink,
  Package,
  Truck,
  XCircle,
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { prisma } from "@/lib/prisma";

type FulfillmentStatus =
  | "PENDING"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

type OrderStatus = "PENDING" | "PAID" | "CANCELED";

const fulfillmentLabels: Record<FulfillmentStatus, string> = {
  CANCELED: "Cancelado",
  DELIVERED: "Entregado",
  PENDING: "Pendiente",
  PREPARING: "Preparando",
  SHIPPED: "Enviado",
};

const orderLabels: Record<OrderStatus, string> = {
  CANCELED: "Cancelado",
  PAID: "Pago confirmado",
  PENDING: "Pago pendiente",
};

const timeline = [
  {
    key: "PENDING",
    title: "Pedido recibido",
    description: "La orden fue creada y esta esperando confirmacion.",
    icon: Clock3,
  },
  {
    key: "PAID",
    title: "Pago confirmado",
    description: "El pago ya quedo registrado.",
    icon: CreditCard,
  },
  {
    key: "PREPARING",
    title: "Preparando",
    description: "El vendedor esta preparando tu compra.",
    icon: Package,
  },
  {
    key: "SHIPPED",
    title: "Enviado",
    description: "Tu pedido ya fue despachado.",
    icon: Truck,
  },
] as const;

function formatDate(value: Date | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);
}

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getOverallProgress(orderStatus: OrderStatus, statuses: FulfillmentStatus[]) {
  if (orderStatus === "CANCELED" || statuses.includes("CANCELED")) return "CANCELED";
  if (orderStatus === "PENDING") return "PENDING";
  if (statuses.includes("SHIPPED") || statuses.includes("DELIVERED")) return "SHIPPED";
  if (statuses.includes("PREPARING")) return "PREPARING";
  return "PAID";
}

function isStepDone(step: (typeof timeline)[number]["key"], progress: string) {
  const order = ["PENDING", "PAID", "PREPARING", "SHIPPED"];
  return order.indexOf(progress) >= order.indexOf(step);
}

function address(order: {
  shippingStreet: string | null;
  shippingNumber: string | null;
  shippingApartment: string | null;
  shippingCity: string | null;
  shippingState: string | null;
  shippingPostalCode: string | null;
  shippingCountry: string | null;
}) {
  return [
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
}

export default async function PedidoDetallePage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    select: {
      id: true,
      total: true,
      status: true,
      createdAt: true,
      buyerName: true,
      shippingStreet: true,
      shippingNumber: true,
      shippingApartment: true,
      shippingCity: true,
      shippingState: true,
      shippingPostalCode: true,
      shippingCountry: true,
      items: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          quantity: true,
          selectedSize: true,
          total: true,
          product: {
            select: {
              name: true,
            },
          },
        },
      },
      settlements: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          fulfillmentStatus: true,
          shippingCarrier: true,
          trackingCode: true,
          trackingUrl: true,
          shippedAt: true,
          deliveredAt: true,
          sellerNotes: true,
          seller: {
            select: {
              name: true,
              storeSlug: true,
            },
          },
        },
      },
    },
  });

  if (!order) {
    notFound();
  }

  const fulfillmentStatuses = order.settlements.map(
    (settlement) => settlement.fulfillmentStatus as FulfillmentStatus
  );
  const progress = getOverallProgress(order.status as OrderStatus, fulfillmentStatuses);
  const currentLabel =
    progress === "CANCELED"
      ? "Pedido cancelado"
      : progress === "PAID"
        ? "Pago confirmado"
        : progress === "PENDING"
          ? "Pago pendiente"
          : fulfillmentLabels[progress as FulfillmentStatus];
  const shippingAddress = address(order);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">

      <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-28 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Seguimiento
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-5xl">
              Pedido {order.id.slice(-8)}
            </h1>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Compra realizada el {formatDate(order.createdAt)}.
            </p>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Estado actual</p>
            <p
              className={`mt-1 text-lg font-semibold ${
                progress === "CANCELED" ? "text-rose-700" : "text-slate-950"
              }`}
            >
              {currentLabel}
            </p>
          </div>
        </div>

        {progress === "CANCELED" ? (
          <section className="mt-8 rounded-lg border border-rose-200 bg-rose-50 p-5 text-rose-800">
            <div className="flex items-center gap-3">
              <XCircle className="h-5 w-5" />
              <h2 className="text-base font-semibold">Este pedido fue cancelado</h2>
            </div>
            <p className="mt-2 text-sm leading-6">
              Si tienes dudas sobre el pago o la entrega, contacta al vendedor o
              al soporte de Afilink con el numero completo del pedido.
            </p>
          </section>
        ) : (
          <section className="mt-8 grid gap-3 sm:grid-cols-4">
            {timeline.map((step) => {
              const done = isStepDone(step.key, progress);
              const Icon = step.icon;

              return (
                <div
                  key={step.key}
                  className={`rounded-lg border bg-white p-4 shadow-sm ${
                    done ? "border-orange-200" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span
                      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg ${
                        done ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    {done ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Circle className="h-5 w-5 text-slate-300" />
                    )}
                  </div>
                  <h2 className="mt-4 text-sm font-semibold text-slate-950">
                    {step.title}
                  </h2>
                  <p className="mt-2 text-sm leading-5 text-slate-600">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </section>
        )}

        <section className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.9fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-slate-950">Productos</h2>
              <span className="text-sm font-semibold text-slate-700">
                {money(order.total)}
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {order.items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-4 rounded-lg bg-slate-50 px-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {item.product.name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      x{item.quantity}
                      {item.selectedSize ? ` - Talle ${item.selectedSize}` : ""}
                    </p>
                  </div>
                  <p className="shrink-0 text-sm font-semibold text-slate-900">
                    {money(item.total)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-950">Entrega</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <div>
                <dt className="font-medium text-slate-500">Comprador</dt>
                <dd className="mt-1 text-slate-900">{order.buyerName ?? "Sin nombre"}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Direccion</dt>
                <dd className="mt-1 leading-6 text-slate-900">
                  {shippingAddress || "Sin direccion cargada"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        <section className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-950">Envios</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {order.settlements.length === 0 && (
              <p className="text-sm leading-6 text-slate-600">
                El envio se va a activar cuando el pago quede confirmado.
              </p>
            )}

            {order.settlements.map((settlement) => (
              <div key={settlement.id} className="rounded-lg bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-950">
                      {settlement.seller.name ?? settlement.seller.storeSlug ?? "Vendedor"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {orderLabels[order.status as OrderStatus]} -{" "}
                      {fulfillmentLabels[settlement.fulfillmentStatus as FulfillmentStatus]}
                    </p>
                  </div>
                  <span className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-700">
                    {fulfillmentLabels[settlement.fulfillmentStatus as FulfillmentStatus]}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm text-slate-600">
                  {settlement.shippingCarrier && (
                    <p>
                      <span className="font-medium text-slate-800">Empresa:</span>{" "}
                      {settlement.shippingCarrier}
                    </p>
                  )}
                  {settlement.trackingCode && (
                    <p>
                      <span className="font-medium text-slate-800">Tracking:</span>{" "}
                      {settlement.trackingCode}
                    </p>
                  )}
                  {settlement.shippedAt && (
                    <p>
                      <span className="font-medium text-slate-800">Enviado:</span>{" "}
                      {formatDate(settlement.shippedAt)}
                    </p>
                  )}
                  {settlement.deliveredAt && (
                    <p>
                      <span className="font-medium text-slate-800">Entregado:</span>{" "}
                      {formatDate(settlement.deliveredAt)}
                    </p>
                  )}
                  {settlement.sellerNotes && (
                    <p className="rounded-lg bg-white p-3 leading-6 text-slate-700">
                      {settlement.sellerNotes}
                    </p>
                  )}
                </div>

                {settlement.trackingUrl && (
                  <a
                    href={settlement.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-orange-700 hover:text-orange-800"
                  >
                    Abrir tracking
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>

        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/pedido"
            className="inline-flex rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
          >
            Consultar otro pedido
          </Link>
          <Link
            href="/products"
            className="inline-flex rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            Volver a la tienda
          </Link>
        </div>
      </main>
    </div>
  );
}
