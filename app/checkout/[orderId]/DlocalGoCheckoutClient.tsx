"use client";

import Script from "next/script";
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
          orderId: order.id,
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
          orderId: order.id,
          checkoutToken,
          cardToken: cardTokenResponse.token,
          clientFirstName: firstName,
          clientLastName: lastName,
          clientDocumentType: documentType,
          clientDocument: documentNumber,
          clientEmail: shipping.buyerEmail,
          installmentsId: installmentsId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data.error ?? "No se pudo confirmar el pago");
      }

      if (data.checkout?.redirectUrl) {
        window.location.href = String(data.checkout.redirectUrl);
        return;
      }

      if (data.payment?.success === true) {
        clearCart();
        window.location.href = `/orders/${order.id}/success`;
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

      <div className="space-y-5">
        <div className="rounded-3xl border border-orange-100 bg-white p-6 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Orden #{order.id}</p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Finaliza tu compra con dLocal Go
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Paga dentro de MarketFill con un formulario seguro de dLocal Go.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Datos de entrega
              </h2>

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
                    className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
                    className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  />
                </label>
              </div>

              <button
                type="button"
                onClick={createTransparentPayment}
                disabled={loading}
                className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {loading && !deliveryConfirmed ? "Preparando pago..." : "Continuar al pago"}
              </button>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              {!deliveryConfirmed ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  Completa y confirma los datos de entrega para habilitar el pago.
                </div>
              ) : (
                <div className="space-y-4">
                  <h2 className="text-lg font-semibold text-slate-900">
                    Tarjeta
                  </h2>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block text-sm font-medium text-slate-700">
                      Tipo de documento
                      <select
                        value={documentType}
                        onChange={(event) => setDocumentType(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
                      className="mt-2 min-h-12 rounded-xl border border-slate-200 px-3 py-3 text-sm outline-none transition focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100"
                    />
                  </div>

                  {installments.length > 1 && (
                    <label className="block text-sm font-medium text-slate-700">
                      Cuotas
                      <select
                        value={installmentsId}
                        onChange={(event) => setInstallmentsId(event.target.value)}
                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
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
                    className="w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
                  >
                    {loading ? "Procesando..." : "Pagar ahora"}
                  </button>
                </div>
              )}
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="space-y-4">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="h-20 w-20 overflow-hidden rounded-2xl bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.product.imageUrls[0] ?? "https://readymadeui.com/images/product14.webp"}
                        alt={item.product.name}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-lg font-semibold text-slate-900">
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
              <div className="mt-5 border-t border-slate-100 pt-4">
                <div className="space-y-2 text-sm text-slate-500">
                  <div className="flex items-center justify-between">
                    <span>Subtotal</span>
                    <span className="font-medium text-slate-700">
                      ${Number(order.subtotal).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Impuestos</span>
                    <span className="font-medium text-slate-700">
                      ${Number(order.taxAmount).toFixed(2)}
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-sm text-slate-500">
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
                Procesando pago con dLocal Go...
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
    </>
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
        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
        type={type}
        autoComplete={autoComplete}
      />
    </label>
  );
}
