"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

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

export default function CampaignForm({ storeSlug, defaultValues, campaignId }: Props) {
  const router = useRouter();
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

  const handleChange = (key: FormKey, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
      className="space-y-5 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
    >
      {message && (
        <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {message}
        </div>
      )}

      <div>
        <label className="text-sm font-medium">Titulo</label>
        <input
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
          value={form.title}
          onChange={(e) => handleChange("title", e.target.value)}
          required
        />
      </div>

      <div>
        <label className="text-sm font-medium">Slug</label>
        <input
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
          value={form.slug}
          onChange={(e) => handleChange("slug", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Descripcion</label>
        <textarea
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
          value={form.description}
          onChange={(e) => handleChange("description", e.target.value)}
        />
      </div>

      <div>
        <label className="text-sm font-medium">Banner URL</label>
        <input
          className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
          value={form.bannerUrl}
          onChange={(e) => handleChange("bannerUrl", e.target.value)}
        />
      </div>

      <div className="flex gap-4">
        <div className="flex-1">
          <label className="text-sm font-medium">Inicio</label>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
            value={form.startsAt}
            onChange={(e) => handleChange("startsAt", e.target.value)}
          />
        </div>

        <div className="flex-1">
          <label className="text-sm font-medium">Fin</label>
          <input
            type="datetime-local"
            className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2"
            value={form.endsAt}
            onChange={(e) => handleChange("endsAt", e.target.value)}
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(e) => handleChange("isActive", e.target.checked)}
        />
        Campana activa
      </label>

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-xl bg-orange-500 py-3 text-sm font-medium text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? "Guardando..." : "Guardar campana"}
      </button>
    </form>
  );
}
