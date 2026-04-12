"use client";

import { useMemo, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";

type OrderCheckoutData = {
  id: string;
  total: number;
  status: string;
  paymentStatus: string | null;
  product: {
    name: string;
    desc: string | null;
    imageUrls: string[];
  };
};

type Props = {
  order: OrderCheckoutData;
  publicKey: string;
};

type PaymentBrickSubmitData = {
  formData: Record<string, unknown>;
};

if (typeof window !== "undefined") {
  const publicKey = process.env.NEXT_PUBLIC_MP_PUBLIC_KEY;

  if (publicKey) {
    initMercadoPago(publicKey, { locale: "es-UY" });
  }
}

function getStatusMessage(status: string | null) {
  switch (status) {
    case "approved":
      return "Pago aprobado. Ya registramos tu compra.";
    case "pending":
      return "Tu pago esta pendiente de confirmacion.";
    case "in_process":
      return "Tu pago esta en revision.";
    case "rejected":
      return "Mercado Pago rechazo el pago. Proba con otro medio.";
    default:
      return null;
  }
}

export default function PaymentBrickClient({ order, publicKey }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(
    order.paymentStatus
  );

  const initialization = useMemo(
    () => ({
      amount: Number(order.total),
    }),
    [order.total]
  );

  const customization = useMemo(
    () => ({
      paymentMethods: {
        creditCard: "all" as const,
        debitCard: "all" as const,
        minInstallments: 1,
        maxInstallments: 12,
        types: {
          excluded: ["wallet_purchase"] as const,
        },
      },
      visual: {
        hideRedirectionPanel: true,
        defaultPaymentOption: {
          creditCardForm: true,
        },
      },
    }),
    []
  );

  const statusMessage = getStatusMessage(paymentStatus);

  if (!publicKey) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        Falta NEXT_PUBLIC_MP_PUBLIC_KEY en tu entorno.
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
        <p className="text-sm font-medium text-slate-500">Orden #{order.id}</p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900">
          Finaliza tu compra con Mercado Pago
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          El pago se procesa dentro de tu app usando Payment Brick.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <Payment
            initialization={initialization}
            customization={customization}
            locale="es-UY"
            onSubmit={async ({ formData }: PaymentBrickSubmitData) => {
              setLoading(true);
              setError(null);

              const response = await fetch("/api/payments/mercadopago/process", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  orderId: order.id,
                  formData,
                }),
              });

              const data = await response.json();
              setLoading(false);

              if (!response.ok || !data.ok) {
                const message =
                  data.error ?? "No se pudo procesar el pago con Mercado Pago";
                setError(message);
                throw new Error(message);
              }

              const status = String(data.payment?.status ?? "pending");
              setPaymentStatus(status);

              if (status === "approved") {
                window.location.href = `/orders/${order.id}/success`;
              }
            }}
            onReady={() => {
              setError(null);
            }}
            onError={(brickError) => {
              setLoading(false);
              setError(
                brickError.message ?? "Mercado Pago no pudo cargar el formulario"
              );
            }}
          />
        </section>

        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex gap-4">
              <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={
                    order.product.imageUrls[0] ??
                    "https://readymadeui.com/images/product14.webp"
                  }
                  alt={order.product.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-slate-900">
                  {order.product.name}
                </p>
                {order.product.desc && (
                  <p className="mt-1 text-sm text-slate-500">
                    {order.product.desc}
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Total</span>
                <span className="text-lg font-semibold text-slate-900">
                  ${Number(order.total).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {statusMessage && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              {statusMessage}
            </div>
          )}

          {loading && (
            <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-800">
              Procesando pago con Mercado Pago...
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
