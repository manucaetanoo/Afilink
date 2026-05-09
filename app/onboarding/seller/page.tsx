"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { BuildingStorefrontIcon, PhotoIcon } from "@heroicons/react/24/outline";


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

export default function SellerOnboardingPage() {
  const router = useRouter();

  const [form, setForm] = useState<SellerForm>({
    companyName: "",
    storeSlug: "",
    logoFile: null,
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

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

  function onChangeSlug(e: React.ChangeEvent<HTMLInputElement>) {
    update("storeSlug", cleanSlug(e.target.value));
  }

  function onPickLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (file.size > 1_000_000) {
      setMsg("La imagen debe pesar máximo 1MB");
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

      // 1) Subir logo si hay archivo
      if (form.logoFile) {
        uploadedImageUrl = await uploadLogoToCloudinary(form.logoFile);
        if (!uploadedImageUrl) {
          throw new Error("Cloudinary no devolvió URL");
        }
      }

      // 2) Guardar empresa
      const payload: Record<string, any> = {
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

      // 3) limpiar archivo local
      if (uploadedImageUrl) {
        update("logoFile", null);
      }

      setMsg("Empresa guardada ✅");
      router.push(`/products`);
    } catch (err: any) {
      setMsg(err?.message ?? "Error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fff7f0] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.12)]">
          <div className="bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 px-6 py-8 text-white sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <BuildingStorefrontIcon className="h-6 w-6" />
              </div>

              <div>
                <p className="text-sm font-medium text-orange-100">
                  Configuración inicial
                </p>
                <h1 className="text-2xl font-bold tracking-tight">
                  Creá tu empresa
                </h1>
              </div>
            </div>

            <p className="mt-4 max-w-lg text-sm text-orange-50/90">
              Elegí el nombre de tu tienda, definí el slug público y subí tu logo.
            </p>
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
                  JPG, PNG o WEBP. 1MB máximo.
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

                <div className="flex overflow-hidden rounded-2xl border border-orange-200 bg-orange-50/40 transition focus-within:border-orange-400 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-100">
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