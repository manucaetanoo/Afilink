"use client";

import Link from "next/link";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    price: number;
    desc: string | null;
    imageUrl: string | null;
    stock?: number;
    commissionValue: number;
    commissionType: "PERCENT" | "FIXED";
  };
  showAffiliateHighlights?: boolean;
  showStock?: boolean;
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(price);
}

function getCommissionLabel(price: number, value: number) {
  return `${value}%`;
}

function getCommissionEarning(price: number, value: number) {
  return Math.round((price * value) / 100);
}

export default function CampaignProductCard({
  product,
  showAffiliateHighlights = true,
  showStock = false,
}: ProductCardProps) {
  const commissionLabel = getCommissionLabel(
    product.price,
    product.commissionValue
  );
  const commissionEarning = getCommissionEarning(
    product.price,
    product.commissionValue
  );
  const hasAffiliateHighlights =
    showAffiliateHighlights && product.commissionValue > 0;
  const hasStock = product.stock === undefined || product.stock > 0;

  return (
    <article className="group overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_15px_50px_-35px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_80px_-35px_rgba(249,115,22,0.45)]">
      <div className="relative overflow-hidden">
        {hasAffiliateHighlights && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
            <div className="rounded-2xl bg-orange-500 px-4 py-3 text-white shadow-lg shadow-orange-500/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-100">
                Comision
              </p>
              <p className="mt-1 text-2xl font-black leading-none">{commissionLabel}</p>
              <p className="mt-1 text-xs text-white/85">por venta</p>
            </div>

            <div className="rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              Ganas {formatPrice(commissionEarning)}
            </div>
          </div>
        )}

        <div className="aspect-[4/4.6] w-full overflow-hidden bg-slate-100">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-90"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-100 via-white to-amber-50 text-sm font-medium text-slate-500">
              Sin imagen
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold leading-tight text-slate-900 transition group-hover:text-orange-700">
              {product.name}
            </h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Precio de venta {formatPrice(product.price)}
            </p>
            {showStock && product.stock !== undefined && (
              <p className="mt-1 text-xs font-semibold text-slate-500">
                {hasStock ? `Stock: ${product.stock}` : "Sin stock"}
              </p>
            )}
          </div>

          {hasAffiliateHighlights && (
            <div className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
              Ideal para afiliados
            </div>
          )}
        </div>

        {product.desc ? (
          <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
            {product.desc}
          </p>
        ) : (
          <p className="mt-4 text-sm text-slate-400">
            Este producto no tiene descripcion todavia.
          </p>
        )}

        {hasAffiliateHighlights && (
          <div className="mt-5 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
              Ganancia estimada
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="text-2xl font-black text-slate-900">
                {formatPrice(commissionEarning)}
              </p>
              <p className="text-right text-xs leading-5 text-slate-500">
                por cada venta atribuida
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Ver producto
          </Link>

          <Link
            href={`/products/${product.id}`}
            aria-disabled={!hasStock}
            className={`inline-flex flex-1 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
              hasStock
                ? "bg-slate-900 hover:bg-orange-500"
                : "pointer-events-none bg-slate-900 opacity-60"
            }`}
          >
            {!hasStock
              ? showStock
                ? "Sin stock"
                : "No disponible"
              : "Comprar ahora"}
          </Link>
        </div>
      </div>
    </article>
  );
}
