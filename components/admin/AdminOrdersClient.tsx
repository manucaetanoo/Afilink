"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FiAlertTriangle,
  FiBox,
  FiCreditCard,
  FiRefreshCcw,
  FiUser,
} from "react-icons/fi";

type OrderStatus = "PENDING" | "PAID" | "CANCELED";
type CommissionStatus = "PENDING" | "APPROVED" | "PAID" | "CANCELED";
type SettlementStatus = "PENDING" | "AVAILABLE" | "PAID" | "CANCELED";
type FulfillmentStatus =
  | "PENDING"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERY_REQUESTED"
  | "DELIVERED"
  | "CANCELED";

export type AdminOrder = {
  id: string;
  total: number;
  status: OrderStatus;
  paymentStatus: string | null;
  paymentProvider: string | null;
  paymentId: string | null;
  createdAt: string;
  buyerName: string | null;
  buyerEmail: string | null;
  buyerPhone: string | null;
  items: Array<{
    id: string;
    quantity: number;
    selectedSize: string | null;
    total: number;
    sellerAmount: number;
    affiliateAmount: number;
    platformAmount: number;
    product: {
      name: string;
    };
    seller: {
      name: string | null;
      email: string | null;
      storeSlug: string | null;
    };
  }>;
  commissions: Array<{
    id: string;
    amount: number;
    status: CommissionStatus;
  }>;
  settlements: Array<{
    id: string;
    netAmount: number;
    status: SettlementStatus;
    fulfillmentStatus: FulfillmentStatus;
    seller: {
      name: string | null;
      email: string | null;
      storeSlug: string | null;
    };
  }>;
};

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusClasses(status: string) {
  if (status === "PAID" || status === "AVAILABLE" || status === "DELIVERED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "DELIVERY_REQUESTED") {
    return "border-violet-200 bg-violet-50 text-violet-700";
  }

  if (status === "CANCELED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    APPROVED: "Aprobada",
    AVAILABLE: "Disponible",
    CANCELED: "Cancelada",
    DELIVERY_REQUESTED: "Entregado por revisar",
    DELIVERED: "Entregada",
    PAID: "Pagada",
    PENDING: "Pendiente",
    PREPARING: "Preparando",
    SHIPPED: "Enviada",
  };

  return labels[status] ?? status;
}

function sellerLabel(seller: {
  name: string | null;
  email: string | null;
  storeSlug: string | null;
}) {
  return seller.name ?? seller.storeSlug ?? seller.email ?? "Seller";
}

export default function AdminOrdersClient({ orders }: { orders: AdminOrder[] }) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function cancelOrder(order: AdminOrder) {
    const reason = window.prompt(
      "Motivo del reembolso/cancelacion. Esto no ejecuta el reembolso en dLocal, solo actualiza Afilink."
    );

    if (reason === null) return;

    const confirmed = window.confirm(
      "Vas a cancelar la orden, anular comisiones/liquidaciones y devolver stock si corresponde. Continuar?"
    );

    if (!confirmed) return;

    setSavingId(order.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${order.id}/cancel`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo cancelar la orden");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrio un error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </div>
      )}

      {orders.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          Todavia no hay ordenes registradas.
        </div>
      ) : (
        orders.map((order) => {
          const sellers = Array.from(
            new Map(order.items.map((item) => [sellerLabel(item.seller), item.seller]))
              .values()
          );
          const canCancel =
            order.status !== "CANCELED" &&
            !order.settlements.some((settlement) => settlement.status === "PAID");

          return (
            <article
              key={order.id}
              className="rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                        order.status
                      )}`}
                    >
                      {statusLabel(order.status)}
                    </span>
                    {order.paymentStatus && (
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                        {order.paymentStatus}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-3 text-lg font-semibold text-slate-950">
                    Orden {order.id.slice(-8)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatDate(order.createdAt)} · {order.paymentProvider ?? "Sin proveedor"}
                  </p>
                </div>

                <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-lg bg-slate-50 px-4 py-3 text-right">
                    <p className="text-xs text-slate-500">Total cobrado</p>
                    <p className="mt-1 text-lg font-semibold text-slate-950">
                      {money(order.total)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => cancelOrder(order)}
                    disabled={!canCancel || savingId === order.id}
                    className="inline-flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      canCancel
                        ? "Cancelar o marcar reembolso"
                        : "No disponible para esta orden"
                    }
                  >
                    <FiRefreshCcw />
                    {savingId === order.id ? "Cancelando..." : "Cancelar/reembolso"}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 p-5 xl:grid-cols-[1fr_1fr_0.9fr]">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiBox />
                    Productos
                  </h3>
                  <div className="mt-3 space-y-2">
                    {order.items.map((item) => (
                      <div
                        key={item.id}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-medium text-slate-800">
                              {item.product.name}
                            </p>
                            <p className="mt-0.5 text-xs text-slate-500">
                              {sellerLabel(item.seller)}
                              {item.selectedSize ? ` · Talle ${item.selectedSize}` : ""}
                            </p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="font-semibold">{money(item.total)}</p>
                            <p className="text-xs text-slate-500">x{item.quantity}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiUser />
                    Comprador y sellers
                  </h3>
                  <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    <p className="font-medium text-slate-800">
                      {order.buyerName ?? "Sin nombre"}
                    </p>
                    <p>{order.buyerEmail ?? "Sin email"}</p>
                    <p>{order.buyerPhone ?? "Sin telefono"}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {sellers.map((seller) => (
                      <span
                        key={sellerLabel(seller)}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600"
                      >
                        {sellerLabel(seller)}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiCreditCard />
                    Liquidaciones
                  </h3>
                  <div className="mt-3 space-y-2">
                    {order.settlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="min-w-0 truncate text-slate-700">
                            {sellerLabel(settlement.seller)}
                          </span>
                          <span className="font-semibold">
                            {money(settlement.netAmount)}
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                              settlement.status
                            )}`}
                          >
                            {statusLabel(settlement.status)}
                          </span>
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                              settlement.fulfillmentStatus
                            )}`}
                          >
                            {statusLabel(settlement.fulfillmentStatus)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {order.settlements.length === 0 && (
                      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                        Esta orden aun no tiene liquidaciones asociadas.
                      </p>
                    )}
                  </div>
                  {order.settlements.some((settlement) => settlement.status === "PAID") && (
                    <p className="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-xs leading-5 text-amber-800">
                      <FiAlertTriangle className="mt-0.5 shrink-0" />
                      Tiene liquidaciones pagadas. Cualquier reembolso requiere ajuste manual.
                    </p>
                  )}
                </div>
              </div>
            </article>
          );
        })
      )}
    </div>
  );
}
