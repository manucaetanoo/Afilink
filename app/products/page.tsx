import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import type { Metadata } from "next";
import ProductsCatalogClient from "@/components/ProductsCatalogClient";
import ProductsHero from "@/components/ProductsHero";
import { getCatalogProducts } from "@/lib/products-catalog";
import { normalizeCatalogFilter, normalizeCatalogSearch } from "@/lib/product-categories";

export const metadata: Metadata = {
  title: "Productos - Afilink",
  description: "Explora productos digitales disponibles en Afilink.",
};

export const revalidate = 60;
const PRODUCTS_PAGE_LIMIT = 40;

type CatalogSearchParams = { q?: string; category?: string; page?: string };

export default async function ProductsPage({ searchParams }: {
  searchParams: Promise<CatalogSearchParams>;
}) {
  const params = await searchParams;
  const search = normalizeCatalogSearch(params.q);
  const category = normalizeCatalogFilter(params.category);
  const requestedPage = Number(params.page);
  let page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    && Number.isSafeInteger((requestedPage - 1) * PRODUCTS_PAGE_LIMIT)
    ? requestedPage : 1;
  let result = await getCatalogProducts({
    search, category, skip: (page - 1) * PRODUCTS_PAGE_LIMIT, take: PRODUCTS_PAGE_LIMIT,
  });
  const lastPage = Math.max(1, Math.ceil(result.total / PRODUCTS_PAGE_LIMIT));
  if (page > lastPage) {
    page = lastPage;
    result = await getCatalogProducts({
      search, category, skip: (page - 1) * PRODUCTS_PAGE_LIMIT, take: PRODUCTS_PAGE_LIMIT,
    });
  }
  const { products, hasMore, total } = result;

  return (
    <div className="min-h-screen bg-white text-[#181917]">
      <Navbar />
      <div className="flex min-h-screen pt-15">
        <Sidebar />
        <main className="relative min-w-0 flex-1">
          <div className="mx-auto max-w-[1440px] px-5 pb-12 sm:px-8 lg:px-10">
            <ProductsHero />
            <ProductsCatalogClient
              products={products}
              pageSize={PRODUCTS_PAGE_LIMIT}
              hasMoreInitial={hasMore}
              totalInitial={total}
              search={search}
              category={category}
              currentPage={page}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
