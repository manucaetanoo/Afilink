"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowUpTrayIcon,
  CalendarDaysIcon,
  CheckCircleIcon,
  LinkIcon,
  PhotoIcon,
  SparklesIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

type CampaignFormValues = {
  title?: string;
  slug?: string;
  description?: string;
  bannerUrl?: string;
  isActive?: boolean;
  startsAt?: string;
  endsAt?: string;
};

type Props = {
  storeSlug?: string | null;
  defaultValues?: CampaignFormValues;
  campaignId?: string;
};

type FormKey = keyof Required<CampaignFormValues>;

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("No se pudo leer la imagen"));
    reader.readAsDataURL(file);
  });
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Ocurrio un error";
}

export default function CampaignForm({ storeSlug, defaultValues, campaignId }: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: defaultValues?.title || "",
    slug: defaultValues?.slug || "",
    description: defaultValues?.description || "",
    bannerUrl: defaultValues?.bannerUrl || "",
    isActive: defaultValues?.isActive ?? true,
    startsAt: defaultValues?.startsAt || "",
    endsAt: defaultValues?.endsAt || "",
  });
  const previewSlug = form.slug.trim() || "slug-de-la-campana";
  const previewStoreSlug = storeSlug?.trim() || "tu-tienda";

  const handleChange = (key: FormKey, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleBannerChange = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    setMessage(null);

    if (!file.type.startsWith("image/")) {
      setMessage("Subi una imagen valida para el banner");
      return;
    }

    if (file.size > 2_500_000) {
      setMessage("El banner no puede superar 2.5MB");
      return;
    }

    try {
      const bannerUrl = await fileToDataUrl(file);
      handleChange("bannerUrl", bannerUrl);
    } catch (error) {
      setMessage(getErrorMessage(error));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const res = await fetch(
      campaignId ? `/api/seller/campaigns/${campaignId}` : "/api/seller/campaigns",
      {
        method: campaignId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      }
    );

    const data = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setMessage(data?.error || "Error guardando campana");
      return;
    }

    router.push(
      campaignId || !storeSlug
        ? "/seller/campaigns"
        : `/store/${storeSlug}`
    );
    router.refresh();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
    >
      <div className="border-b border-slate-200 bg-slate-950 px-6 py-6 text-white sm:px-8">
        <div className="flex items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-orange-500">
            <SparklesIcon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-medium text-orange-200">
              {campaignId ? "Editar campana" : "Nueva campana"}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight">
              Detalles de la promocion
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
              Carga una imagen destacada, define el nombre publico y agenda cuando
              queres que este visible para afiliados y compradores.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-8 px-6 py-7 sm:px-8">
        {message && (
          <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
            {message}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-5">
            <div>
              <label className="text-sm font-semibold text-slate-900">Titulo</label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                value={form.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Ej: Cyber semana de invierno"
                required
              />
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                <LinkIcon className="h-4 w-4 text-orange-500" />
                Slug
              </label>
              <input
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                value={form.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                placeholder="cyber-semana-invierno"
              />
              <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                <span className="font-semibold text-slate-700">
                  afilink.com/store/{previewStoreSlug}/campaign/{previewSlug}
                </span>
                {!storeSlug && (
                  <p className="mt-1 text-orange-700">
                    Configura el slug de tu tienda para ver la URL final.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-900">Descripción</label>
              <textarea
                className="mt-2 min-h-32 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm leading-6 outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
                value={form.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Ej: Descuentos de hasta 50% en productos seleccionados"
              />
            </div>
          </div>

          <div>
            <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <PhotoIcon className="h-4 w-4 text-orange-500" />
              Banner
            </label>
            <div className="overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
              <div className="relative aspect-[16/9] bg-slate-100">
                {form.bannerUrl ? (
                  <Image
                    src={form.bannerUrl}
                    alt="Vista previa del banner"
                    fill
                    unoptimized
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center px-6 text-center text-slate-500">
                    <PhotoIcon className="h-10 w-10 text-slate-400" />
                    <p className="mt-3 text-sm font-medium text-slate-700">
                      Subi una imagen horizontal
                    </p>
                    <p className="mt-1 text-xs leading-5">
                      Ideal 1600 x 900 px, JPG o PNG.
                    </p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2 border-t border-slate-200 bg-white p-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleBannerChange(e.target.files)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  <ArrowUpTrayIcon className="h-4 w-4" />
                  {form.bannerUrl ? "Cambiar imagen" : "Subir imagen"}
                </button>
                {form.bannerUrl && (
                  <button
                    type="button"
                    onClick={() => handleChange("bannerUrl", "")}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <TrashIcon className="h-4 w-4" />
                    Quitar
                  </button>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDaysIcon className="h-4 w-4 text-orange-500" />
              Inicio
            </label>
            <input
              type="datetime-local"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              value={form.startsAt}
              onChange={(e) => handleChange("startsAt", e.target.value)}
            />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <CalendarDaysIcon className="h-4 w-4 text-orange-500" />
              Fin
            </label>
            <input
              type="datetime-local"
              className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-orange-500 focus:ring-4 focus:ring-orange-100"
              value={form.endsAt}
              onChange={(e) => handleChange("endsAt", e.target.value)}
            />
          </div>
        </section>

        <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex items-center gap-3 text-sm font-medium text-slate-700">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => handleChange("isActive", e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-orange-500 focus:ring-orange-500"
            />
            <span className="inline-flex items-center gap-2">
              <CheckCircleIcon className="h-4 w-4 text-emerald-500" />
              Campana activa
            </span>
          </label>

          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 text-sm font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar campana"}
          </button>
        </div>
      </div>
    </form>
  );
}
