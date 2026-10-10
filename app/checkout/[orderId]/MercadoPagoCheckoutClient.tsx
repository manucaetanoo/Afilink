"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  PackageCheck,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import Script from "next/script";
import { trackPurchaseStage } from "@/lib/purchase-tracking";
import type { ReactNode } from "react";
import { useCallback, useEffect, useRef, useState } from "react";

type ShippingData = {
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  shippingStreet: string;
  shippingNumber: string;
  shippingApartment: string;
  shippingCity: string;
  shippingState: string;
  shippingPostalCode: string;
  shippingCountry: string;
  shippingNotes: string;
};

type OrderCheckoutData = {
  id: string;
  total: number;
  subtotal: number;
  status: string;
  paymentStatus: string | null;
  shipping: ShippingData;
  items: Array<{
    id: string;
    total: number;
    selectedSize: string | null;
    selectedColor: string | null;
    product: {
      name: string;
      desc: string | null;
      imageUrls: string[];
    };
  }>;
};

type Props = {
  order: OrderCheckoutData;
  publicKey: string;
  sdkUrl: string;
  checkoutId?: string;
  productId: string;
  draftItems?: Array<{
    productId: string;
    quantity?: number;
    selectedSize?: string | null;
    selectedColor?: string | null;
    clickId?: string;
    campaignClickId?: string;
  }>;
};

type MercadoPagoBrickController = {
  unmount: () => void;
};

type MercadoPagoSdk = {
  bricks: () => {
    create: (
      type: "payment",
      containerId: string,
      settings: Record<string, unknown>
    ) => Promise<MercadoPagoBrickController>;
  };
};

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: Record<string, unknown>) => MercadoPagoSdk;
  }
}

const requiredShippingFields: Array<keyof ShippingData> = [
  "buyerName",
  "buyerEmail",
  "buyerPhone",
];

const ALLOWED_SHIPPING_COUNTRY = "UY";
const paymentBrickContainerId = "paymentBrick_container";

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function getStatusMessage(status: string | null) {
  switch (status) {
    case "approved":
      return "Pago aprobado. Ya registramos tu compra.";
    case "pending":
    case "in_process":
    case "authorized":
      return "Tu pago esta pendiente de confirmacion.";
    case "processing":
    case "unknown":
    case "pending_wallet":
      return "Estamos verificando el pago con Mercado Pago. No vuelvas a pagar hasta conocer el resultado.";
    case "failed":
      return "El intento no pudo iniciarse. Podés volver a preparar el pago.";
    case "rejected":
      return "Mercado Pago rechazo el pago. Proba con otro medio.";
    case "cancelled":
    case "refunded":
    case "charged_back":
      return "El pago fue cancelado o devuelto.";
    default:
      return null;
  }
}

export default function MercadoPagoCheckoutClient({
  order,
  publicKey,
  sdkUrl,
  draftItems,
  checkoutId,
  productId,
}: Props) {
  const brickControllerRef = useRef<MercadoPagoBrickController | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [brickReady, setBrickReady] = useState(false);
  const [brickRevision, setBrickRevision] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [accessConfirmed, setAccessConfirmed] = useState(false);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState(order.id);
  const [total, setTotal] = useState(order.total);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(
    order.paymentStatus
  );
  const [shipping, setShipping] = useState<ShippingData>(order.shipping);
  const attemptIdRef = useRef<string | null>(null);
  const paymentPromiseRef = useRef<Promise<void> | null>(null);
  const lastSubmissionRef = useRef<{ selectedPaymentMethod?: string; formData: Record<string, unknown> } | null>(null);
  const preparingRef = useRef(false);
  const paymentLocked = ["pending", "in_process", "authorized", "processing", "unknown", "pending_wallet", "approved"].includes(paymentStatus ?? "");

  useEffect(() => { trackPurchaseStage("checkout_started", productId); }, [productId]);

  const releaseRejectedAttempt = useCallback(() => {
    const hadSubmission = Boolean(attemptIdRef.current || lastSubmissionRef.current);
    attemptIdRef.current = null;
    lastSubmissionRef.current = null;
    if (hadSubmission) {
      paymentPromiseRef.current = null;
      // An HTTP 200 can still contain a rejected payment. The Brick's completed
      // submission and card token cannot be reused as a fresh payment attempt.
      setBrickReady(false);
      setBrickRevision(current => current + 1);
    }
  }, []);

  const verifyPayment = useCallback(async () => {
    if (paymentOrderId === "pendiente") return;
    const verifyingAttemptId = attemptIdRef.current;
    const response = await fetch("/api/payments/mercadopago/status", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: paymentOrderId }) });
    const data = await response.json();
    if (!response.ok || !data.ok) throw new Error(data.error ?? "No se pudo verificar el pago");
    if (attemptIdRef.current !== verifyingAttemptId) return;
    setPaymentStatus(data.attemptStatus === "unknown" ? "unknown" : data.payment.status);
    if (["rejected", "cancelled", "failed"].includes(data.attemptStatus)) releaseRejectedAttempt();
    if (data.orderStatus === "PAID" && data.redirectUrl) window.location.href = data.redirectUrl;
  }, [paymentOrderId, releaseRejectedAttempt]);

  useEffect(() => {
    if (!paymentLocked || paymentStatus === "approved" || paymentOrderId === "pendiente") return;
    const timer = window.setInterval(() => { if (!document.hidden) void verifyPayment().catch(() => {}); }, 10_000);
    return () => window.clearInterval(timer);
    // Poll only the active order; the endpoint always queries Mercado Pago.
  }, [paymentLocked, paymentStatus, paymentOrderId, verifyPayment]);

  const submitPayment = useCallback((submission: { selectedPaymentMethod?: string; formData: Record<string, unknown> }) => {
    if (paymentPromiseRef.current) return paymentPromiseRef.current;
    const work = async () => {
      if (!attemptIdRef.current) {
        const prepared = await fetch("/api/payments/mercadopago/process", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: paymentOrderId, shippingData: shipping }) });
        const data = await prepared.json();
        if (!prepared.ok || !data.ok) throw new Error(data.error ?? "No se pudo preparar otro intento");
        attemptIdRef.current = String(data.attemptId);
      }
      lastSubmissionRef.current = submission;
      const submittedAttemptId = attemptIdRef.current;
      setPaymentStatus("processing");
      setError(null);
      const response = await fetch("/api/payments/mercadopago/confirm", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ orderId: paymentOrderId, attemptId: submittedAttemptId, ...submission }) });
      const data = await response.json();
      // A newer verification can reject and release this attempt while this
      // request is still in flight. Its older result must not lock the new form.
      if (attemptIdRef.current !== submittedAttemptId) return;
      if (!response.ok || !data.ok) {
        await verifyPayment().catch(() => setPaymentStatus("unknown"));
        throw new Error(data.error ?? "No se pudo confirmar el pago");
      }
      const status = String(data.payment?.status ?? "unknown");
      setPaymentStatus(status);
      if (["rejected", "cancelled", "failed"].includes(status)) {
        releaseRejectedAttempt();
        // Tell the SDK the submission failed instead of resolving it as success.
        throw new Error(getStatusMessage(status) ?? "El pago no fue aprobado. Podés volver a intentarlo.");
      }
      if (status === "approved" && data.checkout?.redirectUrl) window.location.href = data.checkout.redirectUrl;
    };
    const promise = work().catch(err => {
      if (paymentPromiseRef.current === promise) {
        setPaymentStatus(current => current === "processing" ? "unknown" : current);
        setError(err instanceof Error ? err.message : "No se pudo procesar el pago");
        trackPurchaseStage("checkout_error", productId, paymentOrderId);
      }
      throw err;
    }).finally(() => { if (paymentPromiseRef.current === promise) paymentPromiseRef.current = null; });
    paymentPromiseRef.current = promise;
    return promise;
  }, [paymentOrderId, shipping, verifyPayment, productId, releaseRejectedAttempt]);
  const resetBrickSession = (accessConfirmedValue = false) => {
    brickControllerRef.current?.unmount();
    brickControllerRef.current = null;
    setPreferenceId(null);
    setBrickReady(false);
    setAccessConfirmed(accessConfirmedValue);
  };

  useEffect(() => {
    if (!sdkReady || !preferenceId || !window.MercadoPago) return;

    let alive = true;

    const mountBrick = async () => {
      try {
        const MercadoPago = window.MercadoPago;

        if (!MercadoPago) {
          setError("No se pudo cargar Mercado Pago");
          return;
        }

        brickControllerRef.current?.unmount();

        const mp = new MercadoPago(publicKey, { locale: "es-UY" });
        const bricksBuilder = mp.bricks();
        const controller = await bricksBuilder.create(
          "payment",
          paymentBrickContainerId,
          {
            initialization: {
              amount: Number(total),
              preferenceId,
              payer: {
                email: shipping.buyerEmail,
                name: shipping.buyerName,
                firstName: shipping.buyerName,
              },
            },
            customization: {
              paymentMethods: {
                creditCard: "all",
                debitCard: "all",
                prepaidCard: "all",
                ticket: "all",
                mercadoPago: "all",
              },
            },
            callbacks: {
              onReady: () => {
                if (alive) {
                  setBrickReady(true);
                  trackPurchaseStage("payment_ready", productId, paymentOrderId);
                  setError(null);
                }
              },
              onSubmit: (submission: Parameters<typeof submitPayment>[0]) => alive
                ? submitPayment(submission)
                : Promise.reject(new Error("El formulario se actualizó. Volvé a intentar en el formulario actual.")),
              onError: (err: unknown) => {
                if (!alive) return;
                setError(
                  err instanceof Error
                    ? err.message
                    : "No se pudo cargar Mercado Pago"
                );
              },
            },
          }
        );

        if (!alive) {
          controller.unmount();
          return;
        }

        brickControllerRef.current = controller;
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "No se pudo iniciar Mercado Pago"
        );
      }
    };

    void mountBrick();

    return () => {
      alive = false;
      brickControllerRef.current?.unmount();
      brickControllerRef.current = null;
    };
  }, [
    brickRevision,
    preferenceId,
    publicKey,
    sdkReady,
    total,
    paymentOrderId,
    shipping.buyerEmail,
    shipping.buyerName,
    productId,
    submitPayment,
  ]);

  const statusMessage = getStatusMessage(paymentStatus);

  const setShippingField = (field: keyof ShippingData, value: string) => {
    setShipping((current) => ({ ...current, [field]: value }));
    resetBrickSession(false);
  };

  const validateShipping = () => {
    const missingField = requiredShippingFields.find(
      (field) => !shipping[field].trim()
    );

    if (missingField) return "Completa tus datos para recibir el acceso antes de pagar.";
    if (!/^\S+@\S+\.\S+$/.test(shipping.buyerEmail.trim())) {
      return "Ingresa un email valido para recibir la confirmacion.";
    }
    return null;
  };

  const createPaymentSession = async () => {
    if (preparingRef.current) return;
    const shippingError = validateShipping();

    if (shippingError) {
      setError(shippingError);
      return;
    }

    preparingRef.current = true;
    setLoading(true);
    setError(null);
    resetBrickSession(false);

    try {
      const response = await fetch("/api/payments/mercadopago/process", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: paymentOrderId === "pendiente" ? undefined : paymentOrderId,
          items: draftItems,
          checkoutId,
          shippingData: {
            ...shipping,
            shippingCountry: ALLOWED_SHIPPING_COUNTRY,
            shippingStreet: "",
            shippingNumber: "",
            shippingApartment: "",
            shippingCity: "",
            shippingState: "",
            shippingPostalCode: "",
          },
        }),
      });

      const data = await response.json();

      if (data.orderIds?.[0]) {
        setPaymentOrderId(String(data.orderIds[0]));
        window.history.replaceState(null, "", `/checkout/${data.orderIds[0]}`);
      }
      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo iniciar el pago con Mercado Pago");
      }

      const resolvedOrderId = String(data.orderIds?.[0] ?? paymentOrderId);
      const resolvedPreferenceId = data.checkout?.preferenceId;

      if (!resolvedPreferenceId) {
        throw new Error("Mercado Pago no devolvio la preferencia para Bricks");
      }

      attemptIdRef.current = String(data.attemptId);
      if (typeof data.total === "number") setTotal(data.total);
      setPaymentOrderId(resolvedOrderId);
      setPaymentStatus(String(data.payment?.status ?? "pending"));
      setPreferenceId(String(resolvedPreferenceId));
      setAccessConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
    } finally {
      preparingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <>
      <Script src={sdkUrl} strategy="afterInteractive" onReady={() => setSdkReady(true)} onError={() => setError("No pudimos cargar Mercado Pago. Revisá tu conexión y recargá la página.")} />

      <div className="space-y-6">
        {paymentLocked && !accessConfirmed && <div role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900"><p>{statusMessage}</p><button type="button" className="mt-3 min-h-11 rounded-lg border px-4 font-semibold" onClick={() => void verifyPayment().catch(err => setError(err.message))}>Consultar estado del pago</button></div>}
        <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                  <PackageCheck className="h-3.5 w-3.5" />
                  Orden #{paymentOrderId}
                </p>
                <h1 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                  Finaliza tu compra
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Pago seguro con Mercado Pago y datos protegidos durante todo el proceso.
                </p>
              </div>

              <div className="grid w-full grid-cols-3 gap-2 rounded-2xl border border-white/80 bg-white/80 p-2 shadow-sm backdrop-blur md:w-auto md:min-w-80">
                <StepBadge active completed={accessConfirmed} icon={<UserRound className="h-4 w-4" />} label="Datos" />
                <StepBadge active={accessConfirmed} completed={paymentStatus === "approved"} icon={<CreditCard className="h-4 w-4" />} label="Pago" />
                <StepBadge active={paymentStatus === "approved"} completed={paymentStatus === "approved"} icon={<ShieldCheck className="h-4 w-4" />} label="Listo" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <section className="min-w-0 space-y-5">
            <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
              <SectionTitle
                icon={<UserRound className="h-5 w-5" />}
                title="Datos para recibir el acceso"
                description="La empresa usara estos datos para enviarte el producto digital."
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre completo" value={shipping.buyerName} onChange={(value) => setShippingField("buyerName", value)} autoComplete="name" />
                <TextField label="Email" value={shipping.buyerEmail} onChange={(value) => setShippingField("buyerEmail", value)} type="email" autoComplete="email" />
                <TextField label="Telefono" value={shipping.buyerPhone} onChange={(value) => setShippingField("buyerPhone", value.replace(/\D/g, "").slice(0, 9).replace(/(\d{3})(\d{3})(\d{0,3})/, (_match, g1, g2, g3) => (g3 ? `${g1} ${g2} ${g3}` : `${g1} ${g2}`)))} type="tel" autoComplete="tel" />
                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Indicaciones para el vendedor
                  <textarea
                    value={shipping.shippingNotes}
                    onChange={(event) => setShippingField("shippingNotes", event.target.value)}
                    className={`${inputClassName} min-h-24 resize-none`}
                    placeholder="Ej: email alternativo, usuario de la cuenta, datos para activar la licencia."
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={createPaymentSession}
                disabled={loading || paymentLocked}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <UserRound className="h-4 w-4" />
                {loading && !accessConfirmed ? "Preparando pago..." : "Continuar al pago"}
              </button>
            </div>

            <div className="min-w-0 rounded-[1.75rem] border border-slate-200 bg-white p-2 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
              {!accessConfirmed ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>Completa y confirma tus datos para habilitar el pago.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <SectionTitle
                    icon={<CreditCard className="h-5 w-5" />}
                    title="Pago"
                    description="Selecciona el medio de pago y completa los datos en Mercado Pago."
                  />
                  <div
                    id={paymentBrickContainerId}
                    className={`${paymentLocked ? "hidden" : ""} min-h-72 max-w-full min-w-0 rounded-2xl border border-slate-200 bg-white p-0 sm:p-2 [&_form]:!max-w-full [&_form]:!min-w-0`}
                  />
                  {paymentLocked && <div role="status" className="rounded-xl bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    <p>{statusMessage}</p>
                    <button type="button" className="mt-3 min-h-11 rounded-lg border border-amber-300 px-4 font-semibold" onClick={() => void verifyPayment().catch(err => setError(err.message))}>Consultar estado del pago</button>
                    {paymentStatus === "unknown" && lastSubmissionRef.current && lastSubmissionRef.current.selectedPaymentMethod !== "wallet_purchase" && <button type="button" className="ml-2 mt-3 min-h-11 rounded-lg border border-amber-300 px-4 font-semibold" onClick={() => void submitPayment(lastSubmissionRef.current!).catch(() => {})}>Reenviar el mismo intento</button>}
                  </div>}
                  {!brickReady && !paymentLocked && (
                    <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
                      <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
                      <span>Cargando Mercado Pago...</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          <aside className="min-w-0 space-y-4 lg:sticky lg:top-6 lg:self-start">
            <div className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-950">Resumen</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {order.items.length} {order.items.length === 1 ? "producto" : "productos"}
                    </p>
                  </div>
                  <div className="rounded-full bg-orange-100 p-2 text-orange-700">
                    <PackageCheck className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-5">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm">
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-2xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.product.imageUrls[0] ?? "https://readymadeui.com/images/product14.webp"}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-base font-semibold text-slate-950">
                        {item.product.name}
                      </p>
                      {item.product.desc && (
                        <p className="mt-1 line-clamp-2 text-sm text-slate-500">
                          {item.product.desc}
                        </p>
                      )}
                      {item.selectedSize && (
                        <p className="mt-2 inline-flex rounded-full bg-orange-50 px-2 py-1 text-xs font-semibold text-orange-700">
                          Talle {item.selectedSize}
                        </p>
                      )}
                      <p className="mt-2 text-sm font-semibold text-slate-900">
                        ${Number(item.total).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-slate-100 bg-slate-50/70 px-5 py-5">
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">
                    ${Number(total).toFixed(2)} UYU
                  </span>
                </div>
                <p className="mt-3 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  Pago procesado de forma segura
                </p>
              </div>
            </div>

            {statusMessage && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{statusMessage}</span>
              </div>
            )}

            {loading && (
              <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sm leading-6 text-sky-800">
                <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
                <span>Procesando pago con Mercado Pago...</span>
              </div>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}
          </aside>
        </div>
      </div>
    </>
  );
}

function SectionTitle({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-2xl bg-orange-100 p-2.5 text-orange-700">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function StepBadge({
  active,
  completed,
  icon,
  label,
}: {
  active: boolean;
  completed: boolean;
  icon: ReactNode;
  label: string;
}) {
  return (
    <div
      className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-2 py-2 text-center text-xs font-semibold transition ${
        active
          ? "bg-slate-950 text-white shadow-sm"
          : "bg-slate-100 text-slate-500"
      }`}
    >
      {completed ? <CheckCircle2 className="h-4 w-4" /> : icon}
      <span>{label}</span>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  autoComplete,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  autoComplete?: string;
}) {
  return (
    <label className="block text-sm font-medium text-slate-700">
      {label}
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={inputClassName}
        type={type}
        autoComplete={autoComplete}
      />
    </label>
  );
}
