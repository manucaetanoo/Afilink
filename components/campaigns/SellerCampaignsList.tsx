"use client";

import { useState } from "react";
import Link from "next/link";
import DeleteCampaignButton from "@/components/campaigns/DeleteCampaignButton";

export type SellerCampaignListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  productsCount: number;
};

type Props = {
  campaigns: SellerCampaignListItem[];
  storeSlug?: string | null;
  pageSize: number;
  hasMoreInitial: boolean;
};

function formatDate(value: string | null) {
  if (!value) return "Sin fecha";
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(
    new Date(value)
  );
}

function normalizeCampaign(campaign: {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  startsAt: string | null;
  endsAt: string | null;
  _count?: { products: number };
  productsCount?: number;
}): SellerCampaignListItem {
  return {
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    description: campaign.description,
    isActive: campaign.isActive,
    startsAt: campaign.startsAt,
    endsAt: campaign.endsAt,
    productsCount: campaign.productsCount ?? campaign._count?.products ?? 0,
  };
}

export default function SellerCampaignsList({
  campaigns,
  storeSlug,
  pageSize,
  hasMoreInitial,
}: Props) {
  const [items, setItems] = useState(campaigns);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [loadingMore, setLoadingMore] = useState(false);

  async function loadMore() {
    setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        skip: String(items.length),
        take: String(pageSize),
      });
      const res = await fetch(`/api/seller/campaigns?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data?.campaigns)) return;

      setItems((current) => [
        ...current,
        ...data.campaigns.map(normalizeCampaign),
      ]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoadingMore(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <h2 className="text-xl font-semibold">Todavia no tenes campanas</h2>
        <p className="mt-2 text-sm text-slate-500">
          Crea tu primera campana para destacar productos o promociones.
        </p>
        <Link
          href="/seller/campaigns/new"
          className="mt-6 inline-flex rounded-lg bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-orange-600"
        >
          Crear campana
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4">
        {items.map((campaign) => (
          <div
            key={campaign.id}
            className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-lg font-semibold">{campaign.title}</h2>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      campaign.isActive
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {campaign.isActive ? "Activa" : "Inactiva"}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-500">/{campaign.slug}</p>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
                  {campaign.description || "Sin descripcion."}
                </p>
                <div className="mt-4 flex flex-wrap gap-5 text-sm text-slate-500">
                  <span>Inicio: {formatDate(campaign.startsAt)}</span>
                  <span>Fin: {formatDate(campaign.endsAt)}</span>
                  <span>Productos: {campaign.productsCount}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/seller/campaigns/${campaign.id}`}
                  className="rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
                >
                  Editar
                </Link>
                <Link
                  href={`/seller/campaigns/${campaign.id}/products`}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  Productos
                </Link>
                <Link
                  href={`/store/${storeSlug || "store"}/campaign/${campaign.slug}?preview=public`}
                  className="rounded-lg bg-orange-700 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-600"
                >
                  Vista previa
                </Link>
                <DeleteCampaignButton
                  campaignId={campaign.id}
                  campaignTitle={campaign.title}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 flex justify-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={loadingMore}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadingMore ? "Cargando..." : "Cargar mas campanas"}
          </button>
        </div>
      )}
    </>
  );
}
