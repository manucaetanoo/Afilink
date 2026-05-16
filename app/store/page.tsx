import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import ButtonScroll from "@/components/ButtonScroll";
import { Metadata } from "next";


export const metadata: Metadata = {
  title: "Empresas - Afilink",
  description: "Explora empresas con alto potencial de conversion y, si eres afiliado, prioriza las que te dejan mejores comisiones por venta.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StoresPage() {
  const stores = await prisma.user.findMany({
    where: {
      role: "SELLER",
      isActive: true,
      storeSlug: {
        not: null,
      },
    },
    select: {
      id: true,
      name: true,
      image: true,
      storeSlug: true,
      products: {
        where: { isActive: true },
        select: { id: true, imageUrls: true },
      },
      campaigns: {
        where: { isActive: true },
        select: { id: true },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const featuredStores = stores.slice(0, 3);
  const allStores = stores;

  return (
    <div>
<Navbar />
    <div className="min-h-screen bg-white text-slate-900 ">
      {/* HERO */}
      <section className="relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=1600&q=80"
            alt="Stores background"
            className="h-full w-full object-cover opacity-30"
            />
        </div>

        <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/90 to-slate-900/70" />

        <div className="relative mx-auto max-w-7xl px-6 py-24 sm:py-32 lg:px-8">
          <div className="max-w-3xl">
            <span className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm font-medium text-white/90 backdrop-blur">
              Descubre marcas nuevas
            </span>

            <h1 className="mt-6 text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Descubrí todas las empresas de la plataforma
            </h1>

            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-200">
              Explorá empresas, mirá sus productos activos y entrá a cada tienda
              para ver todo su catálogo y campañas disponibles.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
                <ButtonScroll targetId="stores-grid" label="Ver empresas" classname="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100" />
           

              <div className="inline-flex items-center rounded-xl border border-white/20 bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur">
                {allStores.length} empresas activas
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STORES DESTACADAS */}
      {featuredStores.length > 0 && (
          <section className="mx-auto max-w-7xl px-6 pt-16 sm:pt-20 lg:px-8">
          <div className="flex items-end justify-between gap-6">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Empresas destacadas
              </h2>
              
              <p className="mt-2 text-sm text-slate-600">
                Algunas de las empresas más recientes dentro de la plataforma.
              </p>
            </div>
          </div>

          <div className="mt-10 grid gap-8 lg:grid-cols-3">
            {featuredStores.map((store) => {
                const cover =
                store.products.find((p) => p.imageUrls?.[0])?.imageUrls?.[0] ??
                store.image ??
                "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=1200&q=80";
                
                return (
                    <Link
                    key={store.id}
                    href={`/store/${store.storeSlug}`}
                    className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl"
                    >
                  <div className="relative h-72 overflow-hidden">
                    <img
                      src={cover}
                      alt={store.name ?? "Store"}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                      />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-900/20 to-transparent" />

                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <div className="inline-flex rounded-full bg-white/15 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                        {store.campaigns.length} campañas
                      </div>

                      <h3 className="mt-3 text-2xl font-semibold text-white">
                        {store.name || "Store sin nombre"}
                      </h3>

                      <p className="mt-1 text-sm text-slate-200">
                        /store/{store.storeSlug}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between px-6 py-5">
                    <div className="flex gap-6 text-sm text-slate-600">
                      <div>
                        <span className="block text-lg font-semibold text-slate-900">
                          {store.products.length}
                        </span>
                        productos
                      </div>
                      <div>
                        <span className="block text-lg font-semibold text-slate-900">
                          {store.campaigns.length}
                        </span>
                        campañas
                      </div>
                    </div>

                    <span className="text-sm font-semibold text-slate-900 transition group-hover:translate-x-1">
                      Ver tienda →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {/* GRID PRINCIPAL */}
      <section
        id="stores-grid"
        className="mx-auto max-w-7xl px-6 py-16 sm:py-20 lg:px-8"
        >
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Todas las marcas
          </h2>
          <p className="mt-3 text-base text-slate-600">
            Entrá a cada empresa para ver su catálogo completo, productos activos
            y campañas disponibles para promoción.
          </p>
        </div>

        {allStores.length === 0 ? (
            <div className="mt-10 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center">
            <h3 className="text-xl font-semibold text-slate-900">
              No hay stores activas todavía
            </h3>
            <p className="mt-2 text-sm text-slate-600">
              Cuando haya sellers activos con storeSlug asignado, aparecerán acá.
            </p>
          </div>
        ) : (
            <div className="mt-10 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {allStores.map((store) => {
                const previewImages = store.products
                .flatMap((p) => p.imageUrls || [])
                .slice(0, 3);
                
                const logo =
                store.image ||
                previewImages[0] ||
                "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=800&q=80";
                
                return (
                    <Link
                    key={store.id}
                    href={`/store/${store.storeSlug}`}
                    className="group rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-lg"
                    >
                  <div className="flex items-start gap-4">
                    <img
                      src={logo}
                      alt={store.name ?? "Store"}
                      className="h-16 w-16 rounded-2xl object-cover ring-1 ring-slate-200"
                      />

                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-lg font-semibold text-slate-900">
                        {store.name || "Store sin nombre"}
                      </h3>
                      <p className="mt-1 text-sm text-slate-500">
                        /store/{store.storeSlug}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-2xl font-bold text-slate-900">
                        {store.products.length}
                      </p>
                      <p className="text-sm text-slate-600">Productos activos</p>
                    </div>

                    <div className="rounded-2xl bg-slate-50 p-4">
                      <p className="text-2xl font-bold text-slate-900">
                        {store.campaigns.length}
                      </p>
                      <p className="text-sm text-slate-600">Campañas activas</p>
                    </div>
                  </div>

                  <div className="mt-5 flex -space-x-2">
                    {previewImages.length > 0 ? (
                        previewImages.map((img, index) => (
                            <img
                            key={index}
                            src={img}
                            alt={`Preview ${index + 1}`}
                            className="h-10 w-10 rounded-full object-cover ring-2 ring-white"
                            />
                        ))
                    ) : (
                        <div className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-500">
                        Sin imágenes todavía
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-sm text-slate-500">
                      Explorar tienda
                    </span>
                    <span className="text-sm font-semibold text-slate-900 transition group-hover:translate-x-1">
                      Entrar →
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* CTA FINAL */}
      <section className="px-6 pb-16 sm:pb-20 lg:px-8">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-slate-950">
          <div className="grid items-center gap-10 px-8 py-12 lg:grid-cols-2 lg:px-12">
            <div>
              <h2 className="text-3xl font-bold tracking-tight text-white">
                Encontrá marcas para promocionar o comprar
              </h2>
              <p className="mt-4 max-w-xl text-slate-300">
                Navegá entre diferentes empresas, descubrí productos y accedé a
                campañas activas desde una sola plataforma.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 lg:justify-end">
               <ButtonScroll targetId="stores-grid" label="Ver empresas" classname="inline-flex items-center rounded-xl bg-white px-6 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100" />
              
            </div>
          </div>
        </div>
      </section>
                  </div>
    </div>
  );
}
