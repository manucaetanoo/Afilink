"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";

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
  dlocalSplitCode: string;
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
  { value: "DLOCAL_GO", label: "Cuenta dLocal Go" },
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
    dlocalSplitCode: "",
  });

  const [avatarPreview, setAvatarPreview] = useState<string>("/img/sin-foto.jpg");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState<string | null>(null);

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
          dlocalSplitCode: u.dlocalSplitCode ?? "",
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
        dlocalSplitCode: form.dlocalSplitCode,
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
    <div className="relative min-h-[100dvh] overflow-hidden bg-white text-slate-900">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full bg-orange-200/70 blur-3xl" />
        <div className="absolute left-40 top-24 h-[420px] w-[420px] rounded-full bg-amber-200/50 blur-3xl" />
        <div className="absolute -right-52 -bottom-52 h-[640px] w-[640px] rounded-full bg-orange-200/60 blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-slate-200 bg-white/80 shadow-[0_10px_30px_rgba(2,6,23,0.10)] backdrop-blur">
          <div className="grid gap-10 p-8 md:grid-cols-[280px_1fr] md:p-10">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                Mi perfil
              </h1>
              <p className="mt-2 text-sm text-slate-600">
                Configura tu informacion personal y tus datos de cobro.
              </p>
              {msg && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  {msg}
                </div>
              )}
              <button
                type="button"
                onClick={() => router.push("/products")}
                className="mt-4 inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Volver
              </button>
            </div>

            <form onSubmit={onSubmit} className="space-y-8">
              {loading ? (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700">
                  Cargando perfil...
                </div>
              ) : (
                <>
                  <section className="space-y-6">
                    <div className="flex items-center gap-5">
                      <img
                        src={avatarPreview}
                        alt="Avatar"
                        className="h-16 w-16 rounded-xl object-cover ring-1 ring-slate-200"
                      />

                      <div className="flex flex-col gap-1">
                        <div className="flex flex-wrap items-center gap-3">
                          <label className={cn(buttonSoft, "cursor-pointer")}>
                            Cambiar foto
                            <input
                              type="file"
                              accept="image/png,image/jpeg,image/jpg,image/gif"
                              className="hidden"
                              onChange={onPickAvatar}
                            />
                          </label>
                          <span className="text-xs text-slate-500">
                            JPG, GIF o PNG. 1MB max.
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
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

                  <section className="space-y-6 rounded-2xl border border-slate-200 bg-[#fffaf6] p-6">
                    <div>
                      <h2 className="text-xl font-semibold text-slate-900">
                        Datos de facturacion y cobro
                      </h2>
                      <p className="mt-1 text-sm text-slate-600">
                        Estos datos se usaran para liquidarte comisiones o ventas.
                      </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
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

                      <Field label="Titular">
                        <input
                          value={form.payoutHolderName}
                          onChange={(e) => update("payoutHolderName", e.target.value)}
                          className={inputClass}
                        />
                      </Field>

                      <Field label="Tipo de documento">
                        <input
                          value={form.payoutDocumentType}
                          onChange={(e) => update("payoutDocumentType", e.target.value)}
                          className={inputClass}
                          placeholder="CI, DNI, RUT"
                        />
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

                      <Field label="Pais">
                        <input
                          value={form.payoutCountry}
                          onChange={(e) => update("payoutCountry", e.target.value)}
                          className={inputClass}
                          placeholder="UY"
                        />
                      </Field>

                      <Field label="Moneda">
                        <input
                          value={form.payoutCurrency}
                          onChange={(e) => update("payoutCurrency", e.target.value)}
                          className={inputClass}
                          placeholder="UYU"
                        />
                      </Field>

                      <Field label="Banco">
                        <input
                          value={form.bankName}
                          onChange={(e) => update("bankName", e.target.value)}
                          className={inputClass}
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

                      <Field label="Numero de cuenta">
                        <input
                          value={form.bankAccountNumber}
                          onChange={(e) =>
                            update("bankAccountNumber", e.target.value)
                          }
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

                      <Field label="Codigo split dLocal Go" className="md:col-span-2">
                        <input
                          value={form.dlocalSplitCode}
                          onChange={(e) => update("dlocalSplitCode", e.target.value)}
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

                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      className={cn(buttonPrimary, saving && "cursor-not-allowed opacity-70")}
                      disabled={saving}
                    >
                      {saving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    {msg && <span className="text-sm text-slate-700">{msg}</span>}
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
  "w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 " +
  "ring-1 ring-slate-200 placeholder:text-slate-400 " +
  "focus:outline-none focus:ring-2 focus:ring-orange-300/70";

const selectClass =
  "w-full rounded-xl bg-white px-3 py-2.5 text-sm text-slate-900 " +
  "ring-1 ring-slate-200 focus:outline-none focus:ring-2 focus:ring-orange-300/70";

const buttonSoft =
  "inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium " +
  "bg-slate-50 text-slate-900 ring-1 ring-slate-200 hover:bg-slate-100";

const buttonPrimary =
  "inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white " +
  "bg-orange-500 hover:bg-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-300/70";
