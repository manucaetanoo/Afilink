"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import CampaignProductCard from "@/components/campaigns/CampaignProductCard";
import GetCampaignAffiliateLinkButton from "@/components/campaigns/GetCampaignAffiliateLinkButton";

type ProductItem = {
  id: string;
  name: string;
  price: number;
  desc: string | null;
  imageUrl: string | null;
  stock: number;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
};

type Props = {
  campaignId: string;
  sellerId: string;
  products: ProductItem[];
  maxCommission: number;
  maxCommissionEarningLabel: string;
  minPriceLabel: string;
  sellerCampaignHref: string;
};

export function CampaignSummaryPanel({
  campaignId,
  sellerId,
  products,
  maxCommission,
  maxCommissionEarningLabel,
  minPriceLabel,
}: Props) {
  const { data } = useSession();
  const user = data?.user;
  const isAffiliateViewer = user?.role === "AFFILIATE";
  const isSellerViewer = user?.role === "SELLER";
  const canPromoteCampaign = Boolean(
    user?.id && user.id !== sellerId && isAffiliateViewer
  );

  if (!isAffiliateViewer && !isSellerViewer) return null;

  return (
    <section className="relative z-20 -mt-8 px-2 md:-mt-10">
      <div
        className={`grid gap-4 rounded-[28px] border border-orange-100 bg-white/95 p-5 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.35)] backdrop-blur md:p-6 ${
          canPromoteCampaign ? "md:grid-cols-4" : "md:grid-cols-3"
        }`}
      >
        <div className="rounded-2xl bg-gradient-to-br from-orange-50 to-orange-100/60 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Productos
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{products.length}</p>
          <p className="mt-1 text-sm text-slate-600">
            disponibles en esta campaña
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Ticket de entrada
          </p>
          <p className="mt-2 text-lg font-semibold text-slate-900">{minPriceLabel}</p>
          <p className="mt-1 text-sm text-slate-600">
            {isAffiliateViewer
              ? "precio base para empezar a vender"
              : "precio base publicado"}
          </p>
        </div>

        {isAffiliateViewer ? (
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Mejor ganancia
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {maxCommissionEarningLabel}
            </p>
            <p className="mt-1 text-sm text-slate-600">
              comision estimada por venta
            </p>
          </div>
        ) : (
          <div className="rounded-2xl bg-slate-50 p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Incentivo afiliado
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              Hasta {maxCommission}%
            </p>
            <p className="mt-1 text-sm text-slate-600">
              comision visible solo para afiliados
            </p>
          </div>
        )}

        {canPromoteCampaign && (
          <GetCampaignAffiliateLinkButton
            campaignId={campaignId}
            affiliateId={user?.id ?? ""}
          />
        )}
      </div>
    </section>
  );
}

export function CampaignProductsClient({
  products,
}: Pick<Props, "products">) {
  const { data } = useSession();
  const role = data?.user?.role;
  const showAffiliateHighlights = role === "AFFILIATE";
  const showStock = role === "SELLER";

  return (
    <section aria-labelledby="products-heading" className="mt-10">
      <h3 id="products-heading" className="sr-only">
        Products
      </h3>

      <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8">
        {products.map((product) => (
          <CampaignProductCard
            key={product.id}
            product={{
              ...product,
              commissionValue: showAffiliateHighlights ? product.commissionValue : 0,
            }}
            showAffiliateHighlights={showAffiliateHighlights}
            showStock={showStock}
          />
        ))}
      </div>
    </section>
  );
}

export function SellerCampaignPanel({
  sellerId,
  products,
  maxCommission,
  sellerCampaignHref,
}: Pick<Props, "sellerId" | "products" | "maxCommission" | "sellerCampaignHref">) {
  const { data } = useSession();
  const user = data?.user;

  if (user?.role !== "SELLER") return null;

  const isCampaignOwner = user.id === sellerId;

  return (
    <section className="mt-16 rounded-[28px] border border-emerald-100 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(16,185,129,0.45)] md:p-8">
      <div className="grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-600">
            Informacion para empresas
          </p>
          <h3 className="mt-3 text-2xl font-bold text-slate-900">
            {isCampaignOwner
              ? "Esta es la vista publica de tu campaña"
              : "Estas viendo una campaña desde una cuenta de empresa"}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-600">
            Verifica que el catalogo, el stock y la imagen de la campaña esten
            listos antes de enviarla a afiliados o clientes. Las comisiones y el link
            de afiliado quedan reservados para usuarios con rol afiliado.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Productos activos
            </p>
            <p className="mt-2 text-lg font-semibold text-slate-900">
              {products.length}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700">
              Incentivo maximo
            </p>
            <p className="mt-2 text-lg font-semibold text-emerald-900">
              {maxCommission}% para afiliados
            </p>
          </div>
          <Link
            href={sellerCampaignHref}
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-emerald-600"
          >
            {isCampaignOwner ? "Gestionar campaña" : "Ir a mis campañas"}
          </Link>
        </div>
      </div>
    </section>
  );
}
