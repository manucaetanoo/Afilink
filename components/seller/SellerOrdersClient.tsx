"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  FiClock,
  FiExternalLink,
  FiPackage,
  FiTruck,
} from "react-icons/fi";

type FulfillmentStatus =
  | "PENDING"
  | "PREPARING"
  | "SHIPPED"
  | "DELIVERED"
  | "CANCELED";

type SettlementStatus = "PENDING" | "AVAILABLE" | "PAID" | "CANCELED";

type SellerOrder = {
  id: string;
  grossAmount: number;
  platformFee: number;
  affiliateFee: number;
  netAmount: number;
  status: SettlementStatus;
  fulfillmentStatus: FulfillmentStatus;
  shippingCarrier: string | null;
  trackingCode: string | null;
  trackingUrl: string | null;
  sellerNotes: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  createdAt: string;
  seller?: {
    name: string | null;
    email: string | null;
    storeSlug?: string | null;
  };
  order: {
    id: string;
    status: string;
    buyerName: string | null;
    buyerEmail: string | null;
    buyerPhone: string | null;
    shippingStreet: string | null;
    shippingNumber: string | null;
    shippingApartment: string | null;
    shippingCity: string | null;
    shippingState: string | null;
    shippingPostalCode: string | null;
    shippingCountry: string | null;
    shippingNotes: string | null;
    items: Array<{
      id: string;
      quantity: number;
      selectedSize: string | null;
      total: number;
      product: {
        name: string;
      };
    }>;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function statusLabel(status: FulfillmentStatus) {
  const labels: Record<FulfillmentStatus, string> = {
    CANCELED: "Cancelado",
    DELIVERED: "Entregado",
    PENDING: "Pendiente",
    PREPARING: "Preparando",
    SHIPPED: "Enviado",
  };

  return labels[status];
}

function settlementLabel(status: SettlementStatus) {
  const labels: Record<SettlementStatus, string> = {
    AVAILABLE: "Por liquidar",
    CANCELED: "Cancelada",
    PAID: "Liquidada",
    PENDING: "Retenida",
  };

  return labels[status];
}

function statusClasses(status: FulfillmentStatus | SettlementStatus) {
  if (status === "DELIVERED" || status === "AVAILABLE" || status === "PAID") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "SHIPPED" || status === "PREPARING") {
    return "border-sky-200 bg-sky-50 text-sky-700";
  }

  if (status === "CANCELED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function shippingAddress(order: SellerOrder["order"]) {
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

export default function SellerOrdersClient({
  orders,
  canConfirmDelivery = false,
}: {
  orders: SellerOrder[];
  canConfirmDelivery?: boolean;
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function updateFulfillment(
    settlement: SellerOrder,
    formData: FormData,
    fulfillmentStatus: FulfillmentStatus
  ) {
    setSavingId(settlement.id);
    setMessage(null);

    const payload = {
      fulfillmentStatus,
      shippingCarrier: String(formData.get("shippingCarrier") || ""),
      trackingCode: String(formData.get("trackingCode") || ""),
      trackingUrl: String(formData.get("trackingUrl") || ""),
      sellerNotes: String(formData.get("sellerNotes") || ""),
    };

    try {
      const res = await fetch(`/api/seller/settlements/${settlement.id}/fulfillment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo actualizar el envio");
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
          Todavia no hay pedidos pagos para gestionar.
        </div>
      ) : (
        orders.map((settlement) => {
          const lockedForSeller =
            !canConfirmDelivery && settlement.fulfillmentStatus === "DELIVERED";

          return (
            <form
              key={settlement.id}
              action={(formData) =>
                updateFulfillment(
                  settlement,
                  formData,
                  settlement.fulfillmentStatus === "PENDING"
                    ? "PREPARING"
                    : settlement.fulfillmentStatus
                )
              }
              className="rounded-lg border border-slate-200 bg-white shadow-sm"
            >
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 xl:flex-row xl:items-start xl:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                      settlement.fulfillmentStatus
                    )}`}
                  >
                    {statusLabel(settlement.fulfillmentStatus)}
                  </span>
                  <span
                    className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                      settlement.status
                    )}`}
                  >
                    {settlementLabel(settlement.status)}
                  </span>
                </div>

                <h2 className="mt-3 truncate text-lg font-semibold text-slate-950">
                  Orden {settlement.order.id.slice(-8)}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pagada el {formatDate(settlement.createdAt)}
                </p>
                {canConfirmDelivery && settlement.seller && (
                  <p className="mt-1 text-sm text-slate-500">
                    Empresa:{" "}
                    {settlement.seller.name ??
                      settlement.seller.storeSlug ??
                      settlement.seller.email ??
                      "Sin nombre"}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm sm:grid-cols-4 xl:min-w-[520px]">
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Bruto</p>
                  <p className="mt-1 font-semibold">{money(settlement.grossAmount)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Plataforma</p>
                  <p className="mt-1 font-semibold">{money(settlement.platformFee)}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Afiliado</p>
                  <p className="mt-1 font-semibold">{money(settlement.affiliateFee)}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3">
                  <p className="text-xs text-emerald-700">A liquidar</p>
                  <p className="mt-1 font-semibold text-emerald-800">
                    {money(settlement.netAmount)}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-3">
              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiPackage />
                    Productos
                  </h3>
                  <div className="mt-3 space-y-2">
                    {settlement.order.items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-sm"
                      >
                        <span className="min-w-0 text-slate-700">
                          <span className="block truncate">{item.product.name}</span>
                          {item.selectedSize && (
                            <span className="mt-0.5 block text-xs font-semibold text-orange-700">
                              Talle {item.selectedSize}
                            </span>
                          )}
                        </span>
                        <span className="shrink-0 font-semibold">
                          x{item.quantity}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-slate-900">
                    Comprador
                  </h3>
                  <div className="mt-3 space-y-1 text-sm text-slate-600">
                    <p>{settlement.order.buyerName ?? "Sin nombre"}</p>
                    <p>{settlement.order.buyerEmail ?? "Sin email"}</p>
                    <p>{settlement.order.buyerPhone ?? "Sin telefono"}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                    <FiTruck />
                    Entrega
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {shippingAddress(settlement.order) || "Sin direccion cargada"}
                  </p>
                  {settlement.order.shippingNotes && (
                    <p className="mt-2 rounded-lg bg-amber-50 p-3 text-sm leading-6 text-amber-800">
                      {settlement.order.shippingNotes}
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
                  <label className="text-sm font-medium text-slate-700">
                    Empresa de envio
                    <input
                      name="shippingCarrier"
                      defaultValue={settlement.shippingCarrier ?? ""}
                      disabled={lockedForSeller}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Ej: DAC, UES, Correo o Envio propio"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700">
                    Codigo de tracking
                    <input
                      name="trackingCode"
                      defaultValue={settlement.trackingCode ?? ""}
                      disabled={lockedForSeller}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="Codigo de guia o referencia interna"
                    />
                  </label>
                  <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-1">
                    Link de tracking
                    <input
                      name="trackingUrl"
                      defaultValue={settlement.trackingUrl ?? ""}
                      disabled={lockedForSeller}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                      placeholder="https://..."
                    />
                  </label>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-sm font-medium text-slate-700">
                  Nota para la entrega
                  <textarea
                    name="sellerNotes"
                    defaultValue={settlement.sellerNotes ?? ""}
                    rows={5}
                    disabled={lockedForSeller}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    placeholder="Observaciones o evidencia si el envio es propio"
                  />
                </label>

                <div className="rounded-lg bg-slate-50 p-3 text-xs leading-5 text-slate-500">
                  <p>Enviado: {formatDate(settlement.shippedAt)}</p>
                  <p>Entregado: {formatDate(settlement.deliveredAt)}</p>
                </div>

                {settlement.trackingUrl && (
                  <a
                    href={settlement.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 text-sm font-semibold text-orange-600 hover:text-orange-700"
                  >
                    Abrir tracking
                    <FiExternalLink />
                  </a>
                )}

                <div className="flex flex-wrap justify-end gap-2">
                  <button
                    type="submit"
                    disabled={savingId === settlement.id || lockedForSeller}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    <FiClock />
                    Guardar
                  </button>
                  <button
                    type="button"
                    disabled={
                      savingId === settlement.id ||
                      settlement.fulfillmentStatus === "DELIVERED"
                    }
                    onClick={(event) =>
                      updateFulfillment(
                        settlement,
                        new FormData(event.currentTarget.form ?? undefined),
                        "SHIPPED"
                      )
                    }
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
                  >
                    <FiTruck />
                    Marcar enviado
                  </button>
                  {canConfirmDelivery && (
                    <button
                      type="button"
                      disabled={
                        savingId === settlement.id ||
                        settlement.fulfillmentStatus === "DELIVERED"
                      }
                      onClick={(event) =>
                        updateFulfillment(
                          settlement,
                          new FormData(event.currentTarget.form ?? undefined),
                          "DELIVERED"
                        )
                      }
                      className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      Confirmar entrega
                    </button>
                  )}
                </div>
              </div>
            </div>
          </form>
          );
        })
      )}
    </div>
  );
}
