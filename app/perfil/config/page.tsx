"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  FiArrowLeft,
  FiCamera,
  FiCheckCircle,
  FiCreditCard,
  FiInfo,
  FiLock,
  FiUser,
} from "react-icons/fi";

const uploadAvatarToCloudinary = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "products_preset");

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/dyxooovx5/image/upload",
    { method: "POST", body: formData }
  );

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.error?.message || "Error subiendo imagen");
  }

  return data.secure_url as string;
};

type PayoutMethod = "BANK_TRANSFER" | "DLOCAL_GO" | "MANUAL";

type ProfileForm = {
  Nombre: string;
  email: string;
  timezone: string;
  avatarFile?: File | null;
  payoutMethod: PayoutMethod;
  payoutHolderName: string;
  payoutDocumentType: string;
  payoutDocumentNumber: string;
  payoutEmail: string;
  payoutPhone: string;
  payoutCountry: string;
  payoutCurrency: string;
  bankName: string;
  bankAccountType: string;
  bankAccountNumber: string;
  bankAccountAlias: string;
  bankBranch: string;
  payoutNotes: string;
};

const TIMEZONES = [
  "America/Montevideo",
  "UTC",
  "Pacific Standard Time",
  "Eastern Standard Time",
  "Europe/Madrid",
  "Europe/London",
];

const PAYOUT_METHODS: Array<{ value: PayoutMethod; label: string }> = [
  { value: "BANK_TRANSFER", label: "Transferencia bancaria" },
  { value: "DLOCAL_GO", label: "dLocal Go (pago manual)" },
  { value: "MANUAL", label: "Manual" },
];

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function ProfileSettingsWarmPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [form, setForm] = useState<ProfileForm>({
    Nombre: "",
    email: "",
    timezone: "America/Montevideo",
    avatarFile: null,
    payoutMethod: "BANK_TRANSFER",
    payoutHolderName: "",
    payoutDocumentType: "",
    payoutDocumentNumber: "",
    payoutEmail: "",
    payoutPhone: "",
    payoutCountry: "UY",
    payoutCurrency: "UYU",
    bankName: "",
    bankAccountType: "",
    bankAccountNumber: "",
    bankAccountAlias: "",
    bankBranch: "",
    payoutNotes: "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string>("/img/sin-foto.jpg");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);
  const isSuccessMessage = msg === "Guardado";

  function update<K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const res = await fetch("/api/profile", { method: "GET" });
        const data = await res.json().catch(() => null);

        if (!res.ok) throw new Error(data?.error ?? "No se pudo cargar el perfil");

        const u = data?.user;
        if (!u) throw new Error("Respuesta invalida");
        if (!alive) return;

        setForm((prev) => ({
          ...prev,
          Nombre: u.name ?? "",
          email: u.email ?? "",
          timezone: u.timezone ?? "America/Montevideo",
          payoutMethod: (u.payoutMethod ?? "BANK_TRANSFER") as PayoutMethod,
          payoutHolderName: u.payoutHolderName ?? "",
          payoutDocumentType: u.payoutDocumentType ?? "",
          payoutDocumentNumber: u.payoutDocumentNumber ?? "",
          payoutEmail: u.payoutEmail ?? u.email ?? "",
          payoutPhone: u.payoutPhone ?? "",
          payoutCountry: u.payoutCountry ?? "UY",
          payoutCurrency: u.payoutCurrency ?? "UYU",
          bankName: u.bankName ?? "",
          bankAccountType: u.bankAccountType ?? "",
          bankAccountNumber: u.bankAccountNumber ?? "",
          bankAccountAlias: u.bankAccountAlias ?? "",
          bankBranch: u.bankBranch ?? "",
          payoutNotes: u.payoutNotes ?? "",
        }));

        setAvatarPreview(u.image || "/img/sin-foto.jpg");
      } catch (err) {
        if (!alive) return;
        setMsg(err instanceof Error ? err.message : "Error cargando perfil");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  function onPickAvatar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > 1_000_000) {
      setMsg("La imagen debe pesar maximo 1MB");
      return;
    }

    update("avatarFile", file);
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      let uploadedImageUrl: string | undefined;

      if (form.avatarFile) {
        uploadedImageUrl = await uploadAvatarToCloudinary(form.avatarFile);
        if (!uploadedImageUrl) throw new Error("Cloudinary no devolvio URL");
      }

      const payload = {
        name: form.Nombre,
        timezone: form.timezone,
        payoutMethod: form.payoutMethod,
        payoutHolderName: form.payoutHolderName,
        payoutDocumentType: form.payoutDocumentType,
        payoutDocumentNumber: form.payoutDocumentNumber,
        payoutEmail: form.payoutEmail,
        payoutPhone: form.payoutPhone,
        payoutCountry: form.payoutCountry,
        payoutCurrency: form.payoutCurrency,
        bankName: form.bankName,
        bankAccountType: form.bankAccountType,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountAlias: form.bankAccountAlias,
        bankBranch: form.bankBranch,
        payoutNotes: form.payoutNotes,
        ...(uploadedImageUrl ? { image: uploadedImageUrl } : {}),
      };

      const res = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Error al guardar");

      if (uploadedImageUrl) {
        setAvatarPreview(uploadedImageUrl);
        update("avatarFile", null);
      }

      setMsg("Guardado");
      await updateSession({
        user: {
          name: form.Nombre,
          email: form.email,
          image: uploadedImageUrl ?? avatarPreview,
        },
      });
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
              Ajustes de cuenta
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
              Mi perfil
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
              Actualiza tu informacion personal y los datos que usamos para
              procesar tus liquidaciones.
            </p>
          </div>

          <button
            type="button"
            onClick={() => router.push("/products")}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100"
          >
            <FiArrowLeft />
            Volver
          </button>
        </div>


        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 overflow-hidden rounded-2xl bg-slate-100 ring-1 ring-slate-200">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-slate-950">
                  {form.Nombre || "Tu perfil"}
                </p>
                <p className="mt-1 truncate text-sm text-slate-500">
                  {form.email || "Cuenta Afilink"}
                </p>
              </div>
            </div>

            <label className={cn(buttonSoft, "mt-5 w-full cursor-pointer gap-2")}>
              <FiCamera />
              Cambiar foto
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg,image/gif"
                className="hidden"
                onChange={onPickAvatar}
              />
            </label>
            <p className="mt-2 text-xs leading-5 text-slate-500">
              JPG, GIF o PNG. Tamano maximo: 1MB.
            </p>

            <div className="mt-6 space-y-3 border-t border-slate-100 pt-5">
              <SideHint
                icon={<FiUser />}
                title="Perfil"
                text="Nombre, email y zona horaria."
              />
              <SideHint
                icon={<FiCreditCard />}
                title="Cobros"
                text="Datos necesarios para liquidarte saldos."
              />
              <SideHint
                icon={<FiLock />}
                title="Seguridad"
                text="Tu email de acceso no se edita desde esta pantalla."
              />
            </div>
            {msg && (
          <div
            className={cn(
              "mb-5 mt-10 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm shadow-sm",
              isSuccessMessage
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-200 bg-amber-50 text-amber-900"
            )}
          >
            {isSuccessMessage ? (
              <FiCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            ) : (
              <FiInfo className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            )}
            <span>{msg}</span>
          </div>
        )}
          </aside>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <form onSubmit={onSubmit} className="divide-y divide-slate-100">
              {loading ? (
                <div className="p-6 text-sm text-slate-600">
                  Cargando perfil...
                </div>
              ) : (
                <>
                  <section className="space-y-6 p-5 sm:p-6">
                    <SectionHeader
                      icon={<FiUser />}
                      title="Informacion personal"
                      description="Datos basicos visibles para identificar tu cuenta."
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Nombre" className="md:col-span-2">
                        <input
                          value={form.Nombre}
                          onChange={(e) => update("Nombre", e.target.value)}
                          className={inputClass}
                          autoComplete="given-name"
                        />
                      </Field>

                      <Field label="Email" className="md:col-span-2">
                        <input
                          type="email"
                          value={form.email}
                          readOnly
                          className={cn(inputClass, "bg-slate-50 text-slate-600")}
                          autoComplete="email"
                        />
                      </Field>

                      <Field label="Timezone" className="md:col-span-2">
                        <select
                          value={form.timezone}
                          onChange={(e) => update("timezone", e.target.value)}
                          className={selectClass}
                        >
                          {TIMEZONES.map((tz) => (
                            <option key={tz} value={tz}>
                              {tz}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </section>

                  <section className="space-y-6 bg-slate-50/60 p-5 sm:p-6">
                    <SectionHeader
                      icon={<FiCreditCard />}
                      title="Datos de facturacion y cobro"
                      description="Estos datos se usaran para liquidarte comisiones o ventas."
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      <Field label="Metodo de cobro">
                        <select
                          value={form.payoutMethod}
                          onChange={(e) =>
                            update("payoutMethod", e.target.value as PayoutMethod)
                          }
                          className={selectClass}
                        >
                          {PAYOUT_METHODS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      </Field>

                      {form.payoutMethod === "DLOCAL_GO" && (
                        <div className="flex items-start gap-3 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm leading-6 text-orange-900 md:col-span-2">
                          <FiInfo className="mt-1 h-4 w-4 shrink-0" />
                          <span>
                            Este metodo solo guarda tus datos para que Afilink pueda
                            pagarte manualmente. El dinero de las ventas ingresa a la
                            cuenta de la plataforma y luego se liquida segun tus saldos.
                          </span>
                        </div>
                      )}

                      <Field label="Titular">
                        <input
                          value={form.payoutHolderName}
                          onChange={(e) => update("payoutHolderName", e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Tipo de documento">
                        <select
                          value={form.payoutDocumentType}
                          onChange={(e) => update("payoutDocumentType", e.target.value)}
                          className={selectClass}
                        >
                          <option value="CI">CI</option>
                          <option value="DNI">DNI</option>
                          <option value="RUT">RUT</option>
                        </select>
                      </Field>

                      <Field label="Numero de documento">
                        <input
                          value={form.payoutDocumentNumber}
                          onChange={(e) =>
                            update("payoutDocumentNumber", e.target.value)
                          }
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Email de cobro">
                        <input
                          type="email"
                          value={form.payoutEmail}
                          onChange={(e) => update("payoutEmail", e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Telefono">
                        <input
                          value={form.payoutPhone}
                          onChange={(e) => update("payoutPhone", e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="País">
                        <select
                          value={form.payoutCountry}
                          onChange={(e) => update("payoutCountry", e.target.value)}
                          className={inputClass}
                          
                        >
                          <option value="UY">Uruguay</option>
                          <option value="AR">Argentina</option>
                        </select>
                      </Field>

                      <Field label="Moneda">
                        <select
                          value={form.payoutCurrency}
                          onChange={(e) => update("payoutCurrency", e.target.value)}
                          className={inputClass}
                        >
                          <option value="UYU">UYU</option>
                          <option value="USD">USD</option>
                        </select>
                      </Field>

                      <Field label="Banco * ">
                        <input
                          value={form.bankName}
                          onChange={(e) => update("bankName", e.target.value)}
                          className={inputClass}
                          required
                        />
                      </Field>

                      <Field label="Tipo de cuenta">
                        <input
                          value={form.bankAccountType}
                          onChange={(e) => update("bankAccountType", e.target.value)}
                          className={inputClass}
                          placeholder="Caja de ahorro, corriente"
                        />
                      </Field>

                      <Field label="Numero de cuenta *">
                        <input
                          value={form.bankAccountNumber}
                          onChange={(e) =>
                            update("bankAccountNumber", e.target.value)
                          }
                          required
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Alias / identificador">
                        <input
                          value={form.bankAccountAlias}
                          onChange={(e) => update("bankAccountAlias", e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Sucursal" className="md:col-span-2">
                        <input
                          value={form.bankBranch}
                          onChange={(e) => update("bankBranch", e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Notas" className="md:col-span-2">
                        <textarea
                          value={form.payoutNotes}
                          onChange={(e) => update("payoutNotes", e.target.value)}
                          className={cn(inputClass, "min-h-28 resize-y")}
                        />
                      </Field>
                    </div>
                  </section>

                  <div className="flex flex-col gap-3 bg-white p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                    <p className="text-sm leading-6 text-slate-500">
                      Revisa los datos antes de guardar. Los cambios se aplican a
                      futuras solicitudes de liquidacion.
                    </p>
                    <button
                      type="submit"
                      className={cn(buttonPrimary, saving && "cursor-not-allowed opacity-70")}
                      disabled={saving}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-orange-100 p-2.5 text-orange-700">
        {icon}
      </div>
      <div>
        <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p>
      </div>
    </div>
  );
}

function SideHint({
  icon,
  title,
  text,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 text-slate-400">{icon}</div>
      <div>
        <p className="text-sm font-semibold text-slate-800">{title}</p>
        <p className="mt-0.5 text-xs leading-5 text-slate-500">{text}</p>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="mb-2 block text-sm font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm " +
  "placeholder:text-slate-400 transition hover:border-slate-300 " +
  "focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100";

const selectClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900 shadow-sm " +
  "transition hover:border-slate-300 focus:border-orange-400 focus:outline-none focus:ring-4 focus:ring-orange-100";

const buttonSoft =
  "inline-flex items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold " +
  "bg-slate-950 text-white shadow-sm transition hover:bg-slate-800";

const buttonPrimary =
  "inline-flex shrink-0 items-center justify-center rounded-xl px-5 py-3 text-sm font-semibold text-white " +
  "bg-orange-500 shadow-lg shadow-orange-500/20 transition hover:bg-orange-600 focus:outline-none focus:ring-4 focus:ring-orange-100";
