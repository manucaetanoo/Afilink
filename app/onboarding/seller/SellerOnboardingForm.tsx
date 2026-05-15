"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowRightIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  CubeIcon,
  PhotoIcon,
  Squares2X2Icon,
} from "@heroicons/react/24/outline";

const uploadLogoToCloudinary = async (file: File) => {
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

type SellerForm = {
  companyName: string;
  storeSlug: string;
  logoFile: File | null;
};

function cleanSlug(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Error";
}

export default function SellerOnboardingForm() {
  const router = useRouter();
  const { update: updateSession } = useSession();

  const [form, setForm] = useState<SellerForm>({
    companyName: "",
    storeSlug: "",
    logoFile: null,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [completedStoreSlug, setCompletedStoreSlug] = useState<string | null>(null);

  const logoPreview = useMemo(() => {
    if (!form.logoFile) return null;
    return URL.createObjectURL(form.logoFile);
  }, [form.logoFile]);

  function update<K extends keyof SellerForm>(key: K, value: SellerForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function onChangeCompanyName(e: React.ChangeEvent<HTMLInputElement>) {
    const companyName = e.target.value;

    setForm((prev) => ({
      ...prev,
      companyName,
      storeSlug: prev.storeSlug ? prev.storeSlug : cleanSlug(companyName),
    }));
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > 1_000_000) {
      setMsg("La imagen debe pesar maximo 1MB");
      return;
    }

    update("logoFile", file);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setSaving(true);

    try {
      if (!form.companyName.trim()) {
        throw new Error("Debes ingresar el nombre de la empresa");
      }

      if (!form.storeSlug.trim()) {
        throw new Error("Debes ingresar el slug de la empresa");
      }

      let uploadedImageUrl: string | undefined;

      if (form.logoFile) {
        uploadedImageUrl = await uploadLogoToCloudinary(form.logoFile);
        if (!uploadedImageUrl) {
          throw new Error("Cloudinary no devolvio URL");
        }
      }

      const payload: {
        companyName: string;
        storeSlug: string;
        image?: string;
      } = {
        companyName: form.companyName,
        storeSlug: form.storeSlug,
        ...(uploadedImageUrl ? { image: uploadedImageUrl } : {}),
      };

      const res = await fetch("/api/onboarding/seller", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? "Error al guardar");

      if (data?.user) {
        await updateSession({
          user: {
            name: data.user.name,
            image: data.user.image,
            storeSlug: data.user.storeSlug,
          },
        });
      }

      if (uploadedImageUrl) {
        update("logoFile", null);
      }

      setMsg("Empresa guardada");
      setCompletedStoreSlug(data?.user?.storeSlug ?? form.storeSlug);
    } catch (err: unknown) {
      setMsg(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (completedStoreSlug) {
    return (
      <div className="min-h-screen bg-[#fff7f0] px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
            <div className="grid gap-8 px-6 py-8 sm:px-8 lg:grid-cols-[0.9fr_1.1fr] lg:p-10">
              <div>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                  <CheckCircleIcon className="h-8 w-8" />
                </div>

                <p className="mt-6 text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Empresa configurada
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Tu tienda ya esta lista
                </h1>
                <p className="mt-4 text-sm leading-6 text-slate-600">
                  Ahora podes cargar productos, importarlos desde Shopify o Fenicio,
                  y empezar a armar campañas para tus afiliados.
                </p>

                <div className="mt-6 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  Tu URL publica quedo como{" "}
                  <span className="font-semibold">/store/{completedStoreSlug}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-950 text-white">
                    <CubeIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-slate-950">
                      Crear tu primer producto
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Es el siguiente paso recomendado para que la tienda tenga catalogo.
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <div className="flex items-start gap-3">
                      <Squares2X2Icon className="mt-0.5 h-5 w-5 text-orange-500" />
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Carga manual o importacion
                        </p>
                        <p className="mt-1 text-sm leading-6 text-slate-500">
                          Desde la pantalla de crear producto tambien podes importar
                          productos desde Shopify o Fenicio.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">
                      Defini comision afiliada
                    </p>
                    <p className="mt-1 text-sm leading-6 text-slate-500">
                      Cada producto queda con precio, stock, imagen y comision para
                      que los afiliados sepan cuanto pueden ganar.
                    </p>
                  </div>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/seller/products/new"
                    className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600"
                  >
                    Crear primer producto
                    <ArrowRightIcon className="h-4 w-4" />
                  </Link>
                  <Link
                    href="/dashboard/seller"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    Ir al dashboard
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fff7f0] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="grid overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.12)] lg:grid-cols-[0.85fr_1.15fr]">
          <div className="bg-gradient-to-br from-orange-400 via-amber-500 to-orange-500 px-6 py-8 text-white sm:px-8 lg:p-10">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <BuildingStorefrontIcon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-orange-100">
                  Configuracion inicial
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  Crea tu empresa
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-lg text-sm text-orange-50/90">
              Elegi el nombre de tu tienda, defini el slug publico y subi tu logo.
            </p>

            <div className="mt-8 space-y-3 text-sm text-orange-50/95">
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                Tu pagina publica queda lista para mostrar productos y campañas.
              </div>
              <div className="rounded-2xl border border-white/20 bg-white/10 p-4">
                Despues vas a ver el siguiente paso recomendado: crear el primer producto.
              </div>
            </div>
          </div>

          <form onSubmit={onSubmit} className="px-6 py-8 sm:px-8">
            <div className="space-y-8">
              {msg && (
                <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                  {msg}
                </div>
              )}

              <div>
                <label className="mb-3 block text-sm font-semibold text-slate-900">
                  Logo de la empresa
                </label>

                <div className="flex items-center gap-4">
                  <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl border border-orange-200 bg-orange-50">
                    {logoPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <PhotoIcon className="h-8 w-8 text-orange-300" />
                    )}
                  </div>

                  <label className="inline-flex cursor-pointer items-center rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 text-sm font-medium text-orange-700 transition hover:bg-orange-100">
                    Subir logo
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/jpg,image/webp"
                      className="hidden"
                      onChange={onPickLogo}
                    />
                  </label>
                </div>

                <p className="mt-2 text-xs text-slate-500">
                  JPG, PNG o WEBP. 1MB maximo.
                </p>
              </div>

              <div>
                <label
                  htmlFor="companyName"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Nombre de la empresa
                </label>

                <input
                  id="companyName"
                  value={form.companyName}
                  onChange={onChangeCompanyName}
                  placeholder="Ej: Nike"
                  className="block w-full rounded-2xl border border-orange-200 bg-orange-50/40 px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-orange-400 focus:bg-white focus:ring-4 focus:ring-orange-100"
                />
              </div>

              <div>
                <label
                  htmlFor="storeSlug"
                  className="mb-2 block text-sm font-semibold text-slate-900"
                >
                  Slug de la empresa
                </label>

                <div className="flex overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/40 transition focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus:ring-orange-100">
                  <span className="flex items-center border-r border-orange-200 bg-orange-100 px-4 text-sm font-medium text-orange-700">
                    /store/
                  </span>

                  <input
                    id="storeSlug"
                    value={form.storeSlug}
                    onChange={(e) => update("storeSlug", cleanSlug(e.target.value))}
                    placeholder="nike"
                    className="w-full bg-transparent px-4 py-3 text-slate-900 placeholder:text-slate-400 outline-none"
                  />
                </div>

                {form.storeSlug && (
                  <div className="mt-3 rounded-xl border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-800">
                    URL:{" "}
                    <span className="font-semibold">
                      afilink.com/store/{form.storeSlug}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-10 flex items-center justify-end gap-3">
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Guardando..." : "Guardar empresa"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
