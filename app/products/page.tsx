import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import type { Metadata } from "next";
import { unstable_cache } from "next/cache";
import ProductsCatalogClient from "@/components/ProductsCatalogClient";


export const metadata: Metadata = {
  title: "Productos - Afilink",
  description: "Explora productos con alto potencial de conversion y, si eres afiliado, prioriza los que te dejan mejores comisiones por venta.",
};

export const revalidate = 60;

const getActiveProducts = unstable_cache(
  async () =>
    prisma.product.findMany({
      where: {
        isActive: true,
      },
      orderBy: [{ commissionValue: "desc" }, { createdAt: "desc" }],
    }),
  ["active-products"],
  { revalidate: 60, tags: ["products"] }
);

export default async function ProductsPage() {
  const products = await getActiveProducts();

  return (
    <div className="min-h-screen bg-[#fffaf6] text-slate-900">
      <Navbar />

      <div className="flex min-h-screen pt-15">
        <Sidebar />

        <main className="relative flex-1 overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[420px] bg-gradient-to-b from-orange-100/70 via-white to-transparent" />
          <div className="absolute left-[-120px] top-28 -z-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
          <div className="absolute right-[-100px] top-40 -z-10 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />

          <div className="mx-auto max-w-full px-4 py-10 sm:px-6 lg:px-8">
            <div className="py-12 text-center">
              <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
                Catalogo de productos
              </p>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
                Productos listos para vender
              </h1>
              <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600">
                Explora productos con alto potencial de conversion y, si eres afiliado,
                prioriza los que te dejan mejores comisiones por venta.
              </p>
            </div>

            <ProductsCatalogClient products={products} />
          </div>
        </main>
      </div>
    </div>
  );
}
