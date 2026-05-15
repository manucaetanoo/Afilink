"use client";

import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  LockKeyhole,
  MapPin,
  PackageCheck,
  ShieldCheck,
  Truck,
} from "lucide-react";
import Script from "next/script";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

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
  taxAmount: number;
  status: string;
  paymentStatus: string | null;
  shipping: ShippingData;
  items: Array<{
    id: string;
    total: number;
    selectedSize: string | null;
    product: {
      name: string;
      desc: string | null;
      imageUrls: string[];
    };
  }>;
};

type Props = {
  order: OrderCheckoutData;
  smartFieldsApiKey: string;
  sdkUrl: string;
  draftItems?: Array<{
    productId: string;
    quantity?: number;
    selectedSize?: string | null;
    clickId?: string;
    campaignClickId?: string;
  }>;
};

type DlocalField = {
  mount: (element: HTMLElement | null) => void;
};

type DlocalInstallment = {
  id: string;
  currency: string;
  installments: number;
  installment_amount: number;
  total_amount: number;
};

type DlocalGoSdk = {
  initialize: (apiKey: string, checkoutToken: string) => Promise<void> | void;
  fields: () => {
    create: (type: "card", options: Record<string, unknown>) => DlocalField;
  };
  createCardToken: (
    field: DlocalField,
    options: { name: string }
  ) => Promise<{ token: string }>;
  onInstallmentsChange?: (
    callback: (installments: DlocalInstallment[]) => void
  ) => void;
};

declare global {
  interface Window {
    dlocalGo?: DlocalGoSdk;
  }
}

const requiredShippingFields: Array<keyof ShippingData> = [
  "buyerName",
  "buyerEmail",
  "buyerPhone",
  "shippingStreet",
  "shippingNumber",
  "shippingCity",
  "shippingState",
];

const inputClassName =
  "mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";

function splitFullName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] ?? "",
    lastName: parts.slice(1).join(" "),
  };
}

function getStatusMessage(status: string | null) {
  switch (status) {
    case "PAID":
      return "Pago aprobado. Ya registramos tu compra.";
    case "PENDING":
    case "pending":
      return "Tu pago esta pendiente de confirmacion.";
    case "REJECTED":
      return "dLocal Go rechazo el pago. Proba con otro medio.";
    case "CANCELLED":
    case "EXPIRED":
      return "El pago fue cancelado o expiro.";
    default:
      return null;
  }
}

export default function DlocalGoCheckoutClient({
  order,
  smartFieldsApiKey,
  sdkUrl,
  draftItems,
}: Props) {
  const { clearCart } = useCart();
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const cardFieldRef = useRef<DlocalField | null>(null);
  const initializedTokenRef = useRef<string | null>(null);
  const [sdkReady, setSdkReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cardReady, setCardReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deliveryConfirmed, setDeliveryConfirmed] = useState(false);
  const [checkoutToken, setCheckoutToken] = useState<string | null>(null);
  const [paymentOrderId, setPaymentOrderId] = useState(order.id);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(
    order.paymentStatus
  );
  const [installments, setInstallments] = useState<DlocalInstallment[]>([]);
  const [installmentsId, setInstallmentsId] = useState("");
  const [shipping, setShipping] = useState<ShippingData>(order.shipping);
  const [documentType, setDocumentType] = useState("CI");
  const [documentNumber, setDocumentNumber] = useState("");

  useEffect(() => {
    if (!sdkReady || !checkoutToken || initializedTokenRef.current === checkoutToken) {
      return;
    }

    const mountCard = async () => {
      if (!window.dlocalGo) {
        setError("No se pudo cargar dLocal Go SmartFields");
        return;
      }

      try {
        await window.dlocalGo.initialize(smartFieldsApiKey, checkoutToken);
        const fields = window.dlocalGo.fields();
        const cardField = fields.create("card", {
          style: {
            base: {
              color: "#0f172a",
              fontFamily: "Inter, system-ui, sans-serif",
              fontSize: "15px",
              lineHeight: "22px",
              "::placeholder": {
                color: "#94a3b8",
              },
            },
          },
        });

        cardField.mount(cardContainerRef.current);
        cardFieldRef.current = cardField;
        initializedTokenRef.current = checkoutToken;
        setCardReady(true);
        setError(null);

        window.dlocalGo.onInstallmentsChange?.((options) => {
          setInstallments(options ?? []);
          setInstallmentsId("");
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "No se pudo iniciar la tarjeta");
      }
    };

    void mountCard();
  }, [checkoutToken, sdkReady, smartFieldsApiKey]);

  const statusMessage = getStatusMessage(paymentStatus);

  const setShippingField = (field: keyof ShippingData, value: string) => {
    setShipping((current) => ({ ...current, [field]: value }));
    setDeliveryConfirmed(false);
    setCheckoutToken(null);
    setCardReady(false);
    cardFieldRef.current = null;
    initializedTokenRef.current = null;
  };

  const validateShipping = () => {
    const missingField = requiredShippingFields.find(
      (field) => !shipping[field].trim()
    );

    if (missingField) return "Completa los datos de entrega antes de pagar.";
    if (!/^\S+@\S+\.\S+$/.test(shipping.buyerEmail.trim())) {
      return "Ingresa un email valido para recibir la confirmacion.";
    }

    return null;
  };

  const validatePaymentData = () => {
    const shippingError = validateShipping();

    if (shippingError) return shippingError;
    if (!documentNumber.trim()) return "Ingresa el documento del titular.";

    return null;
  };

  const createTransparentPayment = async () => {
    const shippingError = validateShipping();

    if (shippingError) {
      setError(shippingError);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/payments/dlocalgo/process", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: draftItems ? undefined : paymentOrderId,
          items: draftItems,
          shippingData: {
            ...shipping,
            shippingCountry: shipping.shippingCountry || "UY",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo iniciar el pago con dLocal Go");
      }

      const token = data.payment?.merchantCheckoutToken;

      if (!token) {
        throw new Error("dLocal Go no devolvio el token para SmartFields");
      }

      setPaymentStatus(String(data.payment?.status ?? "PENDING"));
      setCheckoutToken(String(token));
      setDeliveryConfirmed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo iniciar el pago");
    } finally {
      setLoading(false);
    }
  };

  const submitPayment = async () => {
    const shippingError = validatePaymentData();
    const cardField = cardFieldRef.current;

    if (shippingError) {
      setError(shippingError);
      return;
    }

    if (!checkoutToken || !cardField || !window.dlocalGo) {
      setError("El formulario de tarjeta todavia no esta listo.");
      return;
    }

    const { firstName, lastName } = splitFullName(shipping.buyerName);
    setLoading(true);
    setError(null);

    try {
      const cardTokenResponse = await window.dlocalGo.createCardToken(cardField, {
        name: shipping.buyerName,
      });

      const response = await fetch("/api/payments/dlocalgo/confirm", {
        method: "POST",
        credentials: "same-origin",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          orderId: draftItems ? undefined : paymentOrderId,
          items: draftItems,
          checkoutToken,
          cardToken: cardTokenResponse.token,
          clientFirstName: firstName,
          clientLastName: lastName,
          clientDocumentType: documentType,
          clientDocument: documentNumber,
          clientEmail: shipping.buyerEmail,
          installmentsId: installmentsId || undefined,
          shippingData: {
            ...shipping,
            shippingCountry: shipping.shippingCountry || "UY",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo confirmar el pago");
      }

      const confirmedOrderId = String(data.orderIds?.[0] ?? paymentOrderId);
      setPaymentOrderId(confirmedOrderId);

      if (data.checkout?.redirectUrl) {
        window.location.href = String(data.checkout.redirectUrl);
        return;
      }

      if (data.payment?.success === true) {
        clearCart();
        window.location.href = `/orders/${confirmedOrderId}/success`;
        return;
      }

      setPaymentStatus(String(data.payment?.status ?? "PENDING"));
      setError(data.payment?.message ?? "El pago quedo pendiente de confirmacion.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo procesar el pago");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Script src={sdkUrl} strategy="afterInteractive" onLoad={() => setSdkReady(true)} />

      <div className="space-y-6">
        <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-[0_24px_70px_rgba(15,23,42,0.08)]">
          <div className="border-b border-orange-100 bg-gradient-to-r from-orange-50 via-white to-amber-50 px-5 py-5 sm:px-7">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-wide text-orange-700">
                  <PackageCheck className="h-3.5 w-3.5" />
                  Orden #{order.id}
                </p>
                <h1 className="mt-3 text-2xl font-bold text-slate-950 sm:text-3xl">
                  Finaliza tu compra
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
                  Pago seguro con dLocal Go y datos protegidos durante todo el proceso.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 rounded-2xl border border-white/80 bg-white/80 p-2 shadow-sm backdrop-blur md:min-w-80">
                <StepBadge active completed={deliveryConfirmed} icon={<Truck className="h-4 w-4" />} label="Entrega" />
                <StepBadge active={deliveryConfirmed} completed={paymentStatus === "PAID"} icon={<CreditCard className="h-4 w-4" />} label="Pago" />
                <StepBadge active={paymentStatus === "PAID"} completed={paymentStatus === "PAID"} icon={<ShieldCheck className="h-4 w-4" />} label="Listo" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.12fr)_minmax(360px,0.88fr)]">
          <section className="space-y-5">
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
              <SectionTitle
                icon={<MapPin className="h-5 w-5" />}
                title="Datos de entrega"
                description="Usaremos esta informacion para coordinar el envio."
              />

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <TextField label="Nombre completo" value={shipping.buyerName} onChange={(value) => setShippingField("buyerName", value)} autoComplete="name" />
                <TextField label="Email" value={shipping.buyerEmail} onChange={(value) => setShippingField("buyerEmail", value)} type="email" autoComplete="email" />
                <TextField label="Telefono" value={shipping.buyerPhone} onChange={(value) => setShippingField("buyerPhone", value.replace(/\D/g, "").slice(0, 9).replace(/(\d{3})(\d{3})(\d{0,3})/, (_match, g1, g2, g3) => (g3 ? `${g1} ${g2} ${g3}` : `${g1} ${g2}`)))} type="tel" autoComplete="tel" />

                <label className="block text-sm font-medium text-slate-700">
                  Departamento
                  <select
                    required
                    value={shipping.shippingState}
                    onChange={(event) => setShippingField("shippingState", event.target.value)}
                    className={inputClassName}
                    autoComplete="address-level1"
                  >
                    <option value="">Selecciona un departamento</option>
                    {[
                      "Artigas",
                      "Canelones",
                      "Cerro Largo",
                      "Colonia",
                      "Durazno",
                      "Flores",
                      "Florida",
                      "Lavalleja",
                      "Maldonado",
                      "Montevideo",
                      "Paysandu",
                      "Rio Negro",
                      "Rivera",
                      "Rocha",
                      "Salto",
                      "San Jose",
                      "Soriano",
                      "Tacuarembo",
                      "Treinta y tres",
                    ].map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                </label>

                <TextField label="Ciudad" value={shipping.shippingCity} onChange={(value) => setShippingField("shippingCity", value)} autoComplete="address-level2" />
                <TextField label="Calle" value={shipping.shippingStreet} onChange={(value) => setShippingField("shippingStreet", value)} autoComplete="address-line1" />
                <TextField label="Numero" value={shipping.shippingNumber} onChange={(value) => setShippingField("shippingNumber", value)} type="number" autoComplete="address-line2" />
                <TextField label="Apto / referencia" value={shipping.shippingApartment} onChange={(value) => setShippingField("shippingApartment", value)} />
                <TextField label="Codigo postal" value={shipping.shippingPostalCode} onChange={(value) => setShippingField("shippingPostalCode", value)} type="number" autoComplete="postal-code" />

                <label className="block text-sm font-medium text-slate-700 sm:col-span-2">
                  Indicaciones
                  <textarea
                    value={shipping.shippingNotes}
                    onChange={(event) => setShippingField("shippingNotes", event.target.value)}
                    className={`${inputClassName} min-h-24 resize-none`}
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={createTransparentPayment}
                disabled={loading}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-slate-950/15 transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
              >
                <Truck className="h-4 w-4" />
                {loading && !deliveryConfirmed ? "Preparando pago..." : "Continuar al pago"}
              </button>
            </div>

            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.06)] sm:p-6">
              {!deliveryConfirmed ? (
                <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                  <span>Completa y confirma los datos de entrega para habilitar el pago.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <SectionTitle
                    icon={<CreditCard className="h-5 w-5" />}
                    title="Tarjeta"
                    description="Ingresa los datos de pago en el formulario seguro."
                  />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Tipo de documento
                      <select
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value)}
                        className={inputClassName}
                      >
                        <option value="CI">CI</option>
                        <option value="RUT">RUT</option>
                      </select>
                    </label>
                    <TextField label="Documento" value={documentNumber} onChange={setDocumentNumber} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Datos de la tarjeta
                    </label>
                    <div
                      ref={cardContainerRef}
                      className="mt-2 min-h-14 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm outline-none transition hover:border-slate-300 focus-within:border-orange-400 focus-within:ring-4 focus-within:ring-orange-100"
                    />
                  </div>

                  {installments.length > 1 && (
                    <label className="block text-sm font-medium text-slate-700">
                      Cuotas
                      <select
                        value={installmentsId}
                        onChange={(event) => setInstallmentsId(event.target.value)}
                        className={inputClassName}
                      >
                        <option value="">Selecciona una opcion</option>
                        {installments.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.installments} cuotas de {option.currency}{" "}
                            {option.installment_amount}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <button
                    type="button"
                    onClick={submitPayment}
                    disabled={loading || !cardReady}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/25 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    <LockKeyhole className="h-4 w-4" />
                    {loading ? "Procesando..." : "Pagar ahora"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
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
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-700">
                      ${Number(order.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Recargo</span>
                    <span className="font-medium text-slate-700">
                      ${Number(order.taxAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-2xl bg-slate-950 px-4 py-3 text-sm text-white">
                  <span className="font-medium">Total</span>
                  <span className="text-xl font-bold">
                    ${Number(order.total).toFixed(2)}
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
                <span>Procesando pago con dLocal Go...</span>
              </div>
            )}

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
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
