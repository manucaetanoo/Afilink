"use client";

import { useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useSession } from "next-auth/react";
import {
  FiArrowRight,
  FiLink,
  FiPackage,
  FiShoppingBag,
  FiSearch,
} from "react-icons/fi";
import ProductCard, { type ProductCardProduct } from "@/components/ProductCard";
import { CATALOG_FILTERS, DEFAULT_CATALOG_FILTER, catalogHref, normalizeCatalogSearch, type CatalogFilter } from "@/lib/product-categories";

type Props = {
  products: ProductCardProduct[];
  pageSize: number;
  hasMoreInitial: boolean;
  totalInitial: number;
  search: string;
  category: CatalogFilter;
  currentPage: number;
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

function AudiencePanel({
  role,
  totalItems,
  topCommission,
  topEarning,
}: {
  role?: string | null;
  totalItems: number;
  topCommission: number;
  topEarning: number;
}) {
  const normalizedRole = String(role ?? "").toUpperCase();
  const isAffiliate = normalizedRole === "AFFILIATE";
  const isSeller = normalizedRole === "SELLER";
  const isAdmin = normalizedRole === "ADMIN";

  if (isAffiliate) {
    return (
      <section className="mt-2 overflow-hidden rounded-xl border border-orange-200 bg-white shadow-sm">
        <div className="grid gap-0 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="p-5 sm:p-6">
            <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
              <FiLink />
              Afiliados
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
              Elegi productos por oportunidad de comision.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
              En esta vista la comision y la ganancia estimada tienen prioridad,
              porque tu trabajo es comparar que conviene promocionar.
            </p>
          </div>

          <div className="grid grid-cols-2 border-t border-orange-100 bg-orange-50/70 lg:border-l lg:border-t-0">
            <div className="p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                Mayor comision
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {topCommission}%
              </p>
            </div>
            <div className="border-l border-orange-100 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                Ganas hasta
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {formatMoney(topEarning)}
              </p>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (isSeller || isAdmin) {
    return (
      <section className="mt-2 grid gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-slate-600">
            <FiPackage />
            Vista de catalogo
          </div>
          <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
            Mira como ven tus productos compradores y afiliados.
          </h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Este marketplace muestra productos activos. Para crear, editar o
            ajustar comisiones, usa tu panel de vendedor.
          </p>
        </div>
        <Link
          href="/seller/products"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          Gestionar productos
          <FiArrowRight />
        </Link>
      </section>
    );
  }

  return (
    <section className="mt-2 rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
        <FiShoppingBag />
        Marketplace
      </div>
      <h2 className="mt-4 text-2xl font-semibold tracking-tight text-slate-950">
        Explora productos digitales listos para comprar.
      </h2>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
        Entrá al producto, revisá los detalles y continuá la compra desde el checkout.
      </p>
      <div className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-700">
        {totalItems} {totalItems === 1 ? "producto disponible" : "productos disponibles"}
      </div>
    </section>
  );
}

function AffiliateSignupPanel() {
  return (
    <section className="mt-12 overflow-hidden rounded-2xl border border-orange-200 bg-white shadow-sm">
      <div className="grid gap-0 lg:grid-cols-[1fr_auto] lg:items-center">
        <div className="p-5 sm:p-6">
          <p className="text-sm font-semibold text-orange-700">
            ¿Queres ganar comision?
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Registrate como afiliado para generar tus propios links y ganar por las
            ventas que lleguen desde tus recomendaciones.
          </p>
        </div>
        <div className="border-t border-orange-100 bg-orange-50/70 p-5 lg:border-l lg:border-t-0">
          <Link
            href="/register"
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 lg:w-auto"
          >
            Crear cuenta de afiliado
            <FiArrowRight />
          </Link>
        </div>
      </div>
    </section>
  );
}

export default function ProductsCatalogClient({
  products: items,
  pageSize,
  hasMoreInitial: hasMore,
  totalInitial: totalItems,
  search,
  category,
  currentPage,
}: Props) {
  useEffect(() => {
    // Start each visit at the top, independently of the previous page's scroll.
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, []);

  const { data } = useSession();
  const router = useRouter();
  const [loadingPage, startTransition] = useTransition();
  const role = data?.user?.role;
  const isVisitor = !role;
  const showAffiliateHighlights = role === "AFFILIATE";
  const isSellerCatalogView = role === "SELLER" || role === "ADMIN";
  const showCommissionBadge = showAffiliateHighlights || isSellerCatalogView;
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
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  function navigate(searchValue: string, filter: CatalogFilter, page = 1) {
    startTransition(() => {
      router.push(catalogHref(normalizeCatalogSearch(searchValue), filter, page), { scroll: false });
    });
  }

  function goToPage(page: number) {
    if (page < 1 || page > totalPages || page === currentPage || loadingPage) return;
    navigate(search, category, page);
  }

  return (
    <>
      <section aria-label="Buscar y filtrar el catálogo" className="border-t border-[#e3e5df] pt-6">
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const form = new FormData(event.currentTarget);
            navigate(String(form.get("q") ?? ""), category);
          }}
          className="flex flex-col gap-3 sm:flex-row"
        >
          <div className="relative flex-1">
            <label htmlFor="catalog-search" className="sr-only">Buscar cursos y productos</label>
            <FiSearch aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg text-[#777970]" />
            <input
              key={search}
              id="catalog-search"
              name="q"
              type="search"
              defaultValue={search}
              maxLength={140}
              placeholder="Buscá cursos, ebooks y herramientas..."
              className="w-full rounded-xl border border-[#e3e5df] bg-[#f8f9f5] py-3.5 pl-12 pr-4 text-sm text-[#181917] outline-none transition placeholder:text-[#777970] focus:border-orange-400 focus:bg-white focus:ring-2 focus:ring-orange-100"
            />
          </div>
          <button type="submit" disabled={loadingPage} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#181917] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-orange-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 disabled:opacity-50">
            <FiSearch aria-hidden="true" /> Buscar
          </button>
        </form>
        <div aria-label="Categorías" className="mt-5 flex flex-wrap gap-2">
          {CATALOG_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={category === filter.value}
              onClick={() => navigate(search, filter.value)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-500 ${category === filter.value ? "border-[#181917] bg-[#181917] text-white" : "border-[#e3e5df] bg-white text-[#62645f] hover:border-orange-300 hover:bg-orange-50 hover:text-orange-700"}`}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="mt-3 text-xs leading-5 text-[#777970]">
          {category === "todos"
            ? "Todos los productos, del más nuevo al más antiguo."
            : "Ordenados por porcentaje de comisión, de mayor a menor."}
        </p>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p role="status" aria-live="polite" aria-atomic="true" className="text-sm text-[#62645f]">
            {loadingPage ? "Buscando productos…" : <>{totalItems} {totalItems === 1 ? "producto encontrado" : "productos encontrados"}{search && <> para <strong>“{search}”</strong></>}</>}
          </p>
          {(search || category !== DEFAULT_CATALOG_FILTER) && (
            <button type="button" onClick={() => navigate("", DEFAULT_CATALOG_FILTER)} className="text-sm font-semibold text-orange-700 underline underline-offset-4 hover:text-orange-900">
              Limpiar filtros
            </button>
          )}
        </div>
      </section>
      <div aria-busy={loadingPage} className={loadingPage ? "pointer-events-none opacity-50" : ""}>
      {items.length === 0 ? (
        <section className="mt-10 rounded-[28px] border border-dashed border-orange-200 bg-white p-12 text-center shadow-sm">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
              *
            </div>
            <h3 className="text-xl font-semibold text-slate-900">
              {search || category !== DEFAULT_CATALOG_FILTER ? "No encontramos resultados" : "Todavía no hay productos publicados"}
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              {search || category !== DEFAULT_CATALOG_FILTER
                ? "Probá con otras palabras o elegí otra categoría para encontrar lo que buscás."
                : "Cuando haya cursos y productos disponibles, los vas a encontrar acá."}
            </p>
          </div>
        </section>
      ) : (
        <>
          <section aria-labelledby="products-heading" className="mt-10">
            <h2 id="products-heading" className="sr-only">
              Cursos y productos
            </h2>

            <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 sm:gap-y-10 xl:grid-cols-3 xl:gap-x-8 2xl:grid-cols-4">
              {items.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  showAffiliateHighlights={showAffiliateHighlights}
                  showCommissionBadge={showCommissionBadge}
                  primaryActionLabel={
                    role === "AFFILIATE"
                      ? "Promocionar"
                      : isSellerCatalogView
                        ? "Ver detalle"
                        : "Comprar"
                  }
                />
              ))}
            </div>

            {totalItems > pageSize && (
              <div className="mt-10 flex flex-col items-center justify-between gap-3 rounded-2xl border border-orange-100 bg-white px-4 py-3 shadow-sm sm:flex-row">
                <p className="text-sm text-slate-500">
                  Pagina {currentPage} de {totalPages} · {totalItems} productos
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(currentPage - 1)}
                    disabled={currentPage === 1 || loadingPage}
                    className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Anterior
                  </button>

                  <span className="rounded-xl bg-orange-50 px-4 py-2.5 text-sm font-semibold text-orange-800">
                    {currentPage} / {totalPages}
                  </span>

                  <button
                    type="button"
                    onClick={() => goToPage(currentPage + 1)}
                    disabled={!hasMore || currentPage >= totalPages || loadingPage}
                    className="rounded-xl border border-orange-200 bg-white px-4 py-2.5 text-sm font-semibold text-orange-700 transition hover:bg-orange-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            )}
          </section>

          <div className="mt-10">
            <AudiencePanel
              role={role}
              totalItems={totalItems}
              topCommission={topCommission}
              topEarning={topEarning}
            />
          </div>

          {isVisitor && <AffiliateSignupPanel />}
        </>
      )}
      </div>
    </>
  );
}
