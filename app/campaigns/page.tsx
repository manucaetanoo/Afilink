import Link from "next/link";
import { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ButtonScroll from "@/components/ButtonScroll";
import { unstable_cache } from "next/cache";
import CampaignsGridClient, {
  type CampaignListItem,
} from "@/components/CampaignsGridClient";

export const metadata: Metadata = {
  title: "Campañas - Afilink",
  description:
    "Explora campañas activas, productos publicados y oportunidades comerciales.",
};

export const revalidate = 60;
export const CAMPAIGNS_PAGE_LIMIT = 12;

const fallbackImage =
  "https://images.unsplash.com/photo-1556740749-887f6717d7e4?auto=format&fit=crop&w=1200&q=80";

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

const getActiveCampaigns = unstable_cache(
  async () => {
    const now = new Date();

    return prisma.campaign.findMany({
      where: {
        isActive: true,
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
        AND: [{ OR: [{ endsAt: null }, { endsAt: { gte: now } }] }],
      },
      orderBy: { createdAt: "desc" },
      take: CAMPAIGNS_PAGE_LIMIT + 1,
      include: {
        seller: {
          select: {
            name: true,
            storeSlug: true,
            image: true,
          },
        },
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                isActive: true,
                commissionValue: true,
                imageUrls: true,
              },
            },
          },
        },
      },
    });
  },
  ["active-campaigns"],
  { revalidate: 60, tags: ["campaigns", "products"] }
);

export default async function CampaignsPage() {
  const isSellerViewer = false;
  const isPublicViewer = true;
  const showAffiliateHighlights = false;
  const showPublicCampaignInfo = !showAffiliateHighlights;

  const campaigns = await getActiveCampaigns();
  const hasMoreCampaigns = campaigns.length > CAMPAIGNS_PAGE_LIMIT;

  const campaignsWithMetrics = campaigns
    .slice(0, CAMPAIGNS_PAGE_LIMIT)
    .map((campaign) => {
      const activeProducts = campaign.products
        .map((item) => item.product)
        .filter((product) => product?.isActive);

      const mainImage =
        campaign.bannerUrl ||
        activeProducts.find((product) => product.imageUrls?.[0])?.imageUrls?.[0] ||
        fallbackImage;

      const maxCommissionPercent = activeProducts.length
        ? Math.max(...activeProducts.map((product) => product.commissionValue || 0))
        : 0;

      const maxEarning = activeProducts.length
        ? Math.max(
          ...activeProducts.map((product) => {
            const price = Number(product.price || 0);
            const commission = Number(product.commissionValue || 0);
            return (price * commission) / 100;
          })
        )
        : 0;

      const minPrice = activeProducts.length
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
  const totalStores = new Set(
    campaignsWithMetrics
      .map((campaign) => campaign.seller?.storeSlug || campaign.seller?.name)
      .filter(Boolean)
  ).size;
  const topCommission = campaignsWithMetrics.length
    ? Math.max(...campaignsWithMetrics.map((campaign) => campaign.maxCommissionPercent))
    : 0;
  const topEarning = campaignsWithMetrics.length
    ? Math.max(...campaignsWithMetrics.map((campaign) => campaign.maxEarning))
    : 0;
  const lowestCampaignPrice = campaignsWithMetrics.length
    ? Math.min(...campaignsWithMetrics.map((campaign) => campaign.minPrice))
    : 0;
  const campaignListItems: CampaignListItem[] = campaignsWithMetrics.map((campaign) => ({
    id: campaign.id,
    title: campaign.title,
    slug: campaign.slug,
    description: campaign.description,
    createdAtMs: new Date(campaign.createdAt).getTime(),
    seller: campaign.seller,
    activeProductsCount: campaign.activeProducts.length,
    mainImage: campaign.mainImage,
    maxCommissionPercent: campaign.maxCommissionPercent,
    maxEarning: campaign.maxEarning,
    minPrice: campaign.minPrice,
  }));

  const heroTitle = showAffiliateHighlights
    ? "Descubri campañas para promocionar y ganar comision real"
    : isSellerViewer
      ? "Explora campañas activas y revisa como se presentan al publico"
      : "Descubri promociones activas y productos destacados";
  const heroDescription = showAffiliateHighlights
    ? "Explora campañas listas para vender, revisa cuanto podes ganar por cada compra y encontra productos de distintas tiendas en un solo lugar."
    : isSellerViewer
      ? "Mira campañas publicadas, compara como muestran sus productos y usa esta vista para inspirar o gestionar tus propias promociones."
      : "Mira promociones disponibles, explora sus productos y entra a comprar en la tienda que mas te interese.";
  const secondaryAction = showAffiliateHighlights
    ? null
    : {
      href: isPublicViewer ? "#campaigns-grid" : "/seller/campaigns",
      label: isSellerViewer ? "Gestionar mis campañas" : "Ver promociones",
    };
  const emptyStateHref = isSellerViewer ? "/seller/campaigns" : "/store";
  const emptyStateLabel = isSellerViewer ? "Crear la primera campaña" : "Ver tiendas";

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
                  {heroTitle}
                </h1>

                <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
                  {heroDescription}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <ButtonScroll targetId="campaigns-grid" label="Explorar campañas" classname="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-500/20 transition hover:bg-orange-600" />
              

                  {secondaryAction && (
                    <Link
                      href={secondaryAction.href}
                      className="rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-semibold text-orange-700 transition hover:bg-orange-50"
                    >
                      {secondaryAction.label}
                    </Link>
                  )}
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
                    <p className="text-2xl font-bold text-slate-900">
                      {showPublicCampaignInfo ? totalStores : `${topCommission}%`}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {showPublicCampaignInfo ? "Tiendas" : "Max. comision"}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-orange-100 bg-white/80 p-4 shadow-sm backdrop-blur">
                    <p className="text-2xl font-bold text-slate-900">
                      {showPublicCampaignInfo
                        ? formatMoney(lowestCampaignPrice)
                        : formatMoney(topEarning)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {showPublicCampaignInfo ? "Precio inicial" : "Max. ganancia"}
                    </p>
                  </div>
                </div>

                {isSellerViewer && (
                  <div className="mt-6 max-w-2xl rounded-2xl border border-sky-100 bg-sky-50 px-5 py-4 text-sm leading-6 text-sky-950 shadow-sm">
                    Si un afiliado comparte una campaña y genera una venta,
                    Afilink atribuye esa venta al afiliado y aplica la comision
                    configurada en el producto vendido.
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white p-3 shadow-[0_25px_80px_-20px_rgba(251,146,60,0.25)] sm:rounded-[2rem] sm:p-4">
                  {featuredCampaign ? (
                    <Link
                      href={getCampaignUrl(
                        featuredCampaign.seller?.storeSlug,
                        featuredCampaign.slug
                      )}
                      className="block"
                    >
                      <div className="relative overflow-hidden rounded-2xl sm:rounded-[1.5rem]">
                        <img
                          src={featuredCampaign.mainImage}
                          alt={featuredCampaign.title}
                          className="aspect-[16/10] w-full object-cover sm:aspect-[4/4.2]"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-slate-900/10 to-transparent" />

                        <div className="absolute left-3 top-3 flex flex-wrap gap-2 sm:left-5 sm:top-5">
                          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-orange-700">
                            Destacada
                          </span>
                          <span className="rounded-full bg-orange-500 px-3 py-1 text-xs font-semibold text-white">
                            {showAffiliateHighlights
                              ? `Hasta ${featuredCampaign.maxCommissionPercent}% comision`
                              : `${featuredCampaign.activeProducts.length} productos`}
                          </span>
                        </div>

                        <div className="absolute bottom-0 left-0 right-0 p-4 text-white sm:p-6">
                          <p className="text-sm font-medium text-orange-200">
                            {featuredCampaign.seller?.name ?? "Tienda"}
                          </p>
                          <h2 className="mt-1 text-xl font-bold sm:mt-2 sm:text-2xl">
                            {featuredCampaign.title}
                          </h2>
                          <p className="mt-2 line-clamp-2 text-sm text-white/80">
                            {featuredCampaign.description ||
                              (showPublicCampaignInfo
                                ? isSellerViewer
                                  ? "Entra para revisar la propuesta publica, productos y presentacion de esta campaña."
                                  : "Entra para ver los productos incluidos y comprar desde esta promocion."
                                : "Entra para descubrir los productos de esta campaña y cuanto podes ganar por venta.")}
                          </p>

                          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs sm:mt-5 sm:gap-3 sm:text-sm">
                            <span className="rounded-full bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                              {featuredCampaign.activeProducts.length} productos
                            </span>
                            <span className="rounded-full bg-white/10 px-3 py-1.5 text-white backdrop-blur">
                              Desde {formatMoney(featuredCampaign.minPrice)}
                            </span>
                            {showAffiliateHighlights && (
                              <span className="rounded-full bg-orange-500/90 px-3 py-1.5 font-semibold text-white">
                                Gana hasta {formatMoney(featuredCampaign.maxEarning)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ) : (
                    <div className="flex aspect-[16/10] items-center justify-center rounded-2xl bg-orange-50 text-center text-slate-500 sm:aspect-[4/4.2] sm:rounded-[1.5rem]">
                      No hay campañas destacadas todavia.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          <CampaignsGridClient
            campaigns={campaignListItems}
            emptyStateHref={emptyStateHref}
            emptyStateLabel={emptyStateLabel}
            pageSize={CAMPAIGNS_PAGE_LIMIT}
            hasMoreInitial={hasMoreCampaigns}
          />
        </main>
      </div>
    </div>
  );
}
