import Link from "next/link";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Tabs from "@/components/Tabs";
import GetCampaignAffiliateLinkButton from "@/components/campaigns/GetCampaignAffiliateLinkButton";
import Sidebar from "@/components/Sidebar";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0, 
    maximumFractionDigits: 2,
  }).format(value);

export default async function CampaignsPage() {
  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      seller: {
        select: {
          name: true,
          storeSlug: true,
          image: true,
        },
      },
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  const campaignsWithMetrics = campaigns
    .map((campaign) => {
      const activeProducts = campaign.products
        .map((item) => item.product)
        .filter((product) => product?.isActive);

      const mainImage =
        activeProducts.find((product) => product.imageUrls?.[0])?.imageUrls?.[0] ??
        "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";

      const maxCommissionPercent =
        activeProducts.length > 0
          ? Math.max(...activeProducts.map((product) => product.commissionValue || 0))
          : 0;

      const maxEarning =
        activeProducts.length > 0
          ? Math.max(
              ...activeProducts.map((product) => {
                const price = Number(product.price || 0);
                const commission = Number(product.commissionValue || 0);
                return (price * commission) / 100;
              })
            )
          : 0;

      const minPrice =
        activeProducts.length > 0
          ? Math.min(...activeProducts.map((product) => Number(product.price || 0)))
          : 0;

      return {
        ...campaign,
        activeProducts,
        mainImage,
        maxCommissionPercent,
        maxEarning,
        minPrice,
      };
    })
    .filter((campaign) => campaign.activeProducts.length > 0);

  const featuredCampaign = campaignsWithMetrics[0];

  const totalCampaigns = campaignsWithMetrics.length;
  const totalProducts = campaignsWithMetrics.reduce(
    (acc, campaign) => acc + campaign.activeProducts.length,
    0
  );
  const topCommission = campaignsWithMetrics.length
    ? Math.max(...campaignsWithMetrics.map((campaign) => campaign.maxCommissionPercent))
    : 0;
  const topEarning = campaignsWithMetrics.length
  ? Math.max(...campaignsWithMetrics.map((campaign) => campaign.maxEarning))
  : 0;
  
  return (
    <div className="min-h-screen bg-[#fffaf5] text-slate-900">
      <Navbar />
      <div className="flex mt-15">
        <Sidebar />
    

      <main className="relative flex-1 overflow-hidden pt-20">
        <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-gradient-to-b from-orange-100/70 via-white to-transparent" />
        <div className="absolute left-[-120px] top-24 -z-10 h-72 w-72 rounded-full bg-orange-200/40 blur-3xl" />
        <div className="absolute right-[-80px] top-40 -z-10 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />

        <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_.95fr]">
            <div>
              <span className="inline-flex items-center rounded-full border border-orange-200 bg-white/80 px-4 py-1.5 text-sm font-medium text-orange-700 shadow-sm backdrop-blur">
                Campañas activas
              </span>

              <h1 className="mt-6 max-w-3xl text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                Descubrí campañas para promocionar y ganar comisión real
              </h1>

              <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                Explorá campañas listas para vender, revisá cuánto podés ganar por
                cada compra y encontrá productos de distintas tiendas en un solo lugar.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="#campaigns-grid"
                  className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                >
                  Explorar campañas
                </Link>

                <Link
                  href="/dashboard/seller/campaigns"
                  className="rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                  >
                  Crear una campaña
                </Link>
              </div>

              <div className="mt-10 grid max-w-2xl grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-slate-900">{totalCampaigns}</p>
                  <p className="mt-1 text-sm text-slate-500">Campañas activas</p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-slate-900">{totalProducts}</p>
                  <p className="mt-1 text-sm text-slate-500">Productos</p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-slate-900">{topCommission}%</p>
                  <p className="mt-1 text-sm text-slate-500">Máx. comisión</p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <p className="text-2xl font-bold text-slate-900">
                    {formatMoney(topEarning)}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">Máx. ganancia</p>
                </div>
              </div>
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[2rem] border border-orange-100 bg-white p-4 shadow-[0_25px_80px_-20px_rgba(251,146,60,0.25)]">
                {featuredCampaign ? (
                  <Link href={`/campaigns/${featuredCampaign.slug}`} className="block">
                    <div className="relative overflow-hidden rounded-[1.5rem]">
                      <img
                        src={featuredCampaign.mainImage}
                        alt={featuredCampaign.slug}
                        className="aspect-[4/4.2] w-full object-cover"
                        />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />

                      <div className="absolute left-5 top-5 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-orange-700">
                          Destacada
                        </span>
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                          Hasta {featuredCampaign.maxCommissionPercent}% comisión
                        </span>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                        <p className="text-sm font-medium text-orange-200">
                          {featuredCampaign.seller?.name ?? "Tienda"}
                        </p>
                        <h2 className="mt-2 text-2xl font-bold">
                          {featuredCampaign.slug}
                        </h2>
                        <p className="mt-2 line-clamp-2 text-sm text-white/80">
                          {featuredCampaign.description ||
                            "Entrá para descubrir los productos de esta campaña y cuánto podés ganar por venta."}
                        </p>

                        <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
                          <span className="rounded-full bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                            {featuredCampaign.activeProducts.length} productos
                          </span>
                          <span className="rounded-full bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                            Desde {formatMoney(featuredCampaign.minPrice)}
                          </span>
                          <span className="rounded-full bg-orange-500/90 px-3 py-1.5 font-semibold text-white">
                            Ganá hasta {formatMoney(featuredCampaign.maxEarning)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div className="flex aspect-[4/4.2] items-center justify-center rounded-[1.5rem] bg-orange-50 text-center text-slate-500">
                    No hay campañas destacadas todavía.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section
          id="campaigns-grid"
          className="mx-auto max-w-7xl px-6 pb-24 lg:px-8"
          >
          <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Campañas
              </p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">
                Campañas para empezar hoy
              </h2>
              <p className="mt-2 text-slate-600">
                Elegí la campaña que mejor encaje con tu audiencia y empezá a promocionar.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
           <Tabs/>
            </div>
          </div>

          {campaignsWithMetrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
              {campaignsWithMetrics.map((campaign) => (
                <article
                key={campaign.id}
                className="group overflow-hidden rounded-[2rem] border border-orange-100 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_-20px_rgba(251,146,60,0.30)]"
                >
                  <Link href={`/store/${campaign.seller?.storeSlug}/campaign/${campaign.slug}`} className="block">
                    <div className="relative overflow-hidden">
                      <img
                        alt={campaign.slug}
                        src={campaign.mainImage}
                        className="aspect-[16/11] w-full object-cover transition duration-500 group-hover:scale-105"
                        />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/35 to-transparent" />

                      <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                        <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-orange-700 shadow-sm">
                          Hasta {campaign.maxCommissionPercent}% comisión
                        </span>
                        <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white shadow-sm">
                          {formatMoney(campaign.maxEarning)}
                        </span>
                      </div>
                    </div>
                  </Link>

                  <div className="p-6">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-orange-50 px-3 py-1.5 font-medium text-orange-700 ring-1 ring-orange-100">
                        {campaign.activeProducts.length} productos
                      </span>
                      <span className="rounded-full bg-slate-50 px-3 py-1.5 font-medium text-slate-600 ring-1 ring-slate-100">
                        Desde {formatMoney(campaign.minPrice)}
                      </span>
                    </div>

                    <h3 className="mt-4 text-xl font-bold leading-tight text-slate-900 transition group-hover:text-orange-700">
                      <Link href={`/store/${campaign.seller?.storeSlug}/campaign/${campaign.slug}`}>{campaign.slug}</Link>
                    </h3>

                    <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">
                      {campaign.description ||
                        "Campaña disponible para afiliados. Revisá los productos, la comisión por venta y todo lo necesario para empezar a promocionarla."}
                    </p>

                    <div className="mt-6 flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        {campaign.seller?.image ? (
                          <img
                          alt={campaign.seller.name ?? "Seller"}
                          src={campaign.seller.image}
                          className="h-11 w-11 rounded-full object-cover ring-1 ring-orange-100"
                          />
                        ) : (
                          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 text-sm font-semibold text-orange-700 ring-1 ring-orange-200">
                            {campaign.seller?.name?.charAt(0)?.toUpperCase() ?? "S"}
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-semibold text-slate-900">
                            {campaign.seller?.name ?? "Tienda"}
                          </p>
                          <p className="text-xs text-slate-500">Seller</p>
                        </div>
                      </div>

                      <div className="text-right">
                        <p className="text-xs text-slate-500">Ganá hasta</p>
                        <p className="text-base font-bold text-orange-600">
                          {formatMoney(campaign.maxEarning)}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6">
                      <Link
                        href={`/store/${campaign.seller?.storeSlug}/campaign/${campaign.slug}`}
                        className="inline-flex items-center text-sm font-semibold text-orange-600 transition hover:text-orange-700"
                        >
                        Ver campaña
                        <span className="ml-2 transition group-hover:translate-x-1">→</span>
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-[2rem] border border-orange-100 bg-white px-8 py-20 text-center shadow-sm">
              <div className="mx-auto max-w-xl">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-orange-50 text-2xl">
                  🔥
                </div>
                <h3 className="mt-6 text-2xl font-bold text-slate-900">
                  No hay campañas activas todavía
                </h3>
                <p className="mt-3 text-slate-600">
                  Cuando los sellers publiquen campañas, vas a poder explorarlas acá,
                  ver su comisión y empezar a promocionarlas.
                </p>
                <div className="mt-8">
                  <Link
                    href="/dashboard/seller/campaigns"
                    className="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600"
                    >
                    Crear la primera campaña
                  </Link>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
                      </div>
    </div>
  );
}