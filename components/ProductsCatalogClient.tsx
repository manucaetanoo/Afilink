"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import ProductCard, { type ProductCardProduct } from "@/components/ProductCard";

type Props = {
  products: ProductCardProduct[];
  pageSize: number;
  hasMoreInitial: boolean;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getCommissionEarning = (price: number, commissionValue: number) => {
  return Math.round((price * commissionValue) / 100);
};

export default function ProductsCatalogClient({
  products,
  pageSize,
  hasMoreInitial,
}: Props) {
  const { data } = useSession();
  const [items, setItems] = useState(products);
  const [hasMore, setHasMore] = useState(hasMoreInitial);
  const [loadingMore, setLoadingMore] = useState(false);
  const showAffiliateHighlights = data?.user?.role === "AFFILIATE";
  const topCommission = items.length
    ? Math.max(...items.map((product) => Number(product.commissionValue || 0)))
    : 0;
  const topEarning = items.length
    ? Math.max(
        ...items.map((product) =>
          getCommissionEarning(
            Number(product.price || 0),
            Number(product.commissionValue || 0)
          )
        )
      )
    : 0;
  const minPrice = items.length
    ? Math.min(...items.map((product) => Number(product.price || 0)))
    : 0;

  async function loadMore() {
    setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        skip: String(items.length),
        take: String(pageSize),
      });
      const res = await fetch(`/api/products?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data?.products)) return;

      setItems((current) => [...current, ...data.products]);
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoadingMore(false);
    }
  }

  return (
    <>
      <section aria-labelledby="filter-heading" className="border-t border-orange-100 pt-6">
        <h2 id="filter-heading" className="sr-only">
          Product filters
        </h2>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
              {items.length} {items.length === 1 ? "producto" : "productos"}
            </div>
            <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
              Desde {formatMoney(minPrice)}
            </div>
            {showAffiliateHighlights && (
              <>
                <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-500 px-4 py-2 text-sm font-semibold text-white shadow-sm">
                  Hasta {topCommission}% de comision
                </div>
                <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                  Ganas hasta {formatMoney(topEarning)} por venta
                </div>
              </>
            )}
          </div>

          <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
            Ordenados por oportunidad comercial
          </div>
        </div>
      </section>

      {items.length === 0 ? (
        <section className="mt-10 rounded-[28px] border border-dashed border-orange-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              *
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              No hay productos publicados
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Cuando haya productos activos, los vas a ver aca con una vista mucho mas
              orientada a venta y promocion.
            </p>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="products-heading" className="mt-10">
            <h2 id="products-heading" className="sr-only">
              Products
            </h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 sm:gap-y-10 xl:grid-cols-3 xl:gap-x-8 2xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAffiliateHighlights={showAffiliateHighlights}
                />
              ))}
            </div>
            {hasMore && (
              <div className="mt-10 flex justify-center">
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "Cargando..." : "Cargar mas productos"}
                </button>
              </div>
            )}
          </section>

          {showAffiliateHighlights && (
            <section
              aria-labelledby="featured-heading"
              className="relative mt-16 overflow-hidden rounded-[28px] lg:h-[26rem]"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-700" />
              <div className="absolute right-[-80px] top-[-40px] h-64 w-64 rounded-full bg-orange-400/20 blur-3xl" />
              <div className="absolute left-[-40px] bottom-[-60px] h-56 w-56 rounded-full bg-amber-200/10 blur-3xl" />
              <div className="relative flex h-full flex-col justify-between gap-8 p-8 lg:flex-row lg:items-end lg:p-10">
                <div className="max-w-2xl">
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
                    Destacado para afiliados
                  </p>
                  <h2
                    id="featured-heading"
                    className="mt-4 text-3xl font-bold tracking-tight text-white sm:text-4xl"
                  >
                    Esta pagina ahora empuja primero los productos con mejor comision
                  </h2>
                  <p className="mt-4 max-w-xl text-sm leading-7 text-white/80 sm:text-base">
                    El foco visual esta puesto en lo que mas te importa: cuanto puedes
                    ganar por venta y cuales son los productos mas atractivos para
                    promocionar.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-200">
                      Mejor comision
                    </p>
                    <p className="mt-2 text-3xl font-black text-white">
                      {topCommission}%
                    </p>
                  </div>
                  <div className="rounded-2xl border border-orange-300/20 bg-orange-500/90 p-5 text-white shadow-lg shadow-orange-500/20">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-100">
                      Ganancia maxima
                    </p>
                    <p className="mt-2 text-3xl font-black">{formatMoney(topEarning)}</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </>
  );
}
