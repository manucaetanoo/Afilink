"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Tabs from "@/components/Tabs";

export type CampaignListItem = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  createdAtMs: number;
  seller: {
    name: string | null;
    storeSlug: string | null;
    image: string | null;
  } | null;
  activeProductsCount: number;
  mainImage: string;
  maxCommissionPercent: number;
  maxEarning: number;
  minPrice: number;
};

type CampaignSort = "commission" | "attractive" | "newest";

type Props = {
  campaigns: CampaignListItem[];
  emptyStateHref: string;
  emptyStateLabel: string;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);

function getCampaignUrl(storeSlug: string | null | undefined, slug: string) {
  return `/store/${storeSlug || "store"}/campaign/${slug}`;
}

function parseSort(value: string | null): CampaignSort {
  if (value === "attractive" || value === "newest") return value;
  return "commission";
}

export default function CampaignsGridClient({
  campaigns,
  emptyStateHref,
  emptyStateLabel,
}: Props) {
  const searchParams = useSearchParams();
  const { data } = useSession();
  const currentSort = parseSort(searchParams.get("sort"));
  const role = data?.user?.role;
  const isSellerViewer = role === "SELLER";
  const showAffiliateHighlights = role === "AFFILIATE";
  const showPublicCampaignInfo = !showAffiliateHighlights;
  const gridTitle = showAffiliateHighlights
    ? "Campanas para empezar hoy"
    : isSellerViewer
      ? "Campanas publicas para revisar"
      : "Promociones disponibles";
  const gridDescription = showAffiliateHighlights
    ? "Elegi la campana que mejor encaje con tu audiencia y empeza a promocionar."
    : isSellerViewer
      ? "Revisa el catalogo publico de campanas activas y entra a gestionar las tuyas cuando quieras."
      : "Elegi una promocion, revisa sus productos y compra desde la tienda.";
  const sortedCampaigns = [...campaigns].sort((a, b) => {
    if (currentSort === "newest") {
      return b.createdAtMs - a.createdAtMs;
    }

    if (currentSort === "attractive") {
      return (
        b.activeProductsCount - a.activeProductsCount ||
        a.minPrice - b.minPrice ||
        b.createdAtMs - a.createdAtMs
      );
    }

    return (
      b.maxCommissionPercent - a.maxCommissionPercent ||
      b.maxEarning - a.maxEarning ||
      b.createdAtMs - a.createdAtMs
    );
  });

  return (
    <section id="campaigns-grid" className="mx-auto max-w-7xl px-6 pb-24 lg:px-8">
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
            Campanas
          </p>
          <h2 className="mt-2 text-3xl font-bold text-slate-900">{gridTitle}</h2>
          <p className="mt-2 text-slate-600">{gridDescription}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Tabs currentSort={currentSort} />
        </div>
      </div>

      {sortedCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-8 xl:grid-cols-3">
          {sortedCampaigns.map((campaign) => {
            const campaignUrl = getCampaignUrl(campaign.seller?.storeSlug, campaign.slug);

            return (
              <article
                key={campaign.id}
                className="group overflow-hidden rounded-2xl border border-orange-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-20px_rgba(251,146,60,0.30)] sm:rounded-[2rem]"
              >
                <Link href={campaignUrl} className="block">
                  <div className="relative overflow-hidden">
                    <img
                      alt={campaign.title}
                      src={campaign.mainImage}
                      className="aspect-[16/8.5] w-full object-cover transition duration-500 group-hover:scale-105 sm:aspect-[16/11]"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />

                    <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-4 sm:top-4">
                      <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                        {showAffiliateHighlights
                          ? `Hasta ${campaign.maxCommissionPercent}% comision`
                          : `${campaign.activeProductsCount} productos`}
                      </span>
                      {showAffiliateHighlights && (
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                          {formatMoney(campaign.maxEarning)}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>

                <div className="p-4 sm:p-6">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700 ring-1 ring-orange-100">
                      {campaign.activeProductsCount} productos
                    </span>
                    <span className="rounded-full bg-slate-50 px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-100">
                      Desde {formatMoney(campaign.minPrice)}
                    </span>
                  </div>

                  <h3 className="mt-3 text-lg font-bold leading-tight text-slate-900 transition group-hover:text-orange-700 sm:mt-4 sm:text-xl">
                    <Link href={campaignUrl}>{campaign.title}</Link>
                  </h3>

                  <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-600 sm:mt-3 sm:line-clamp-3">
                    {campaign.description ||
                      (showPublicCampaignInfo
                        ? isSellerViewer
                          ? "Campana activa con productos publicados. Revisa su presentacion publica y usala como referencia para tus promociones."
                          : "Promocion activa con productos disponibles. Entra para ver detalles y comprar desde la tienda."
                        : "Campana disponible para afiliados. Revisa los productos, la comision por venta y todo lo necesario para empezar a promocionarla.")}
                  </p>

                  <div className="mt-4 flex items-center justify-between gap-3 sm:mt-6 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-3">
                      {campaign.seller?.image ? (
                        <img
                          alt={campaign.seller.name ?? "Seller"}
                          src={campaign.seller.image}
                          className="h-9 w-9 rounded-full object-cover ring-1 ring-orange-100 sm:h-11 sm:w-11"
                        />
                      ) : (
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 ring-1 ring-orange-200 sm:h-11 sm:w-11">
                          {campaign.seller?.name?.charAt(0)?.toUpperCase() ?? "S"}
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {campaign.seller?.name ?? "Tienda"}
                        </p>
                        <p className="text-xs text-slate-500">Tienda</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-slate-500">
                        {showAffiliateHighlights ? "Gana hasta" : "Desde"}
                      </p>
                      <p className="text-base font-bold text-orange-600">
                        {showAffiliateHighlights
                          ? formatMoney(campaign.maxEarning)
                          : formatMoney(campaign.minPrice)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 sm:mt-6">
                    <Link
                      href={campaignUrl}
                      className="inline-flex items-center text-sm font-semibold text-orange-600 transition hover:text-orange-700"
                    >
                      Ver campana
                      <span className="ml-2 transition group-hover:translate-x-1">
                        -&gt;
                      </span>
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-[2rem] border border-orange-100 bg-white px-8 py-20 text-center shadow-sm">
          <div className="mx-auto max-w-xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-2xl">
              *
            </div>
            <h3 className="mt-6 text-2xl font-bold text-slate-900">
              No hay campanas activas todavia
            </h3>
            <p className="mt-3 text-slate-600">
              Cuando haya promociones activas, vas a poder explorarlas aca.
            </p>
            <div className="mt-8">
              <Link
                href={emptyStateHref}
                className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
              >
                {emptyStateLabel}
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
