import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import CampaignProductCard from "@/components/campaigns/CampaignProductCard";
import { unstable_cache } from "next/cache";
import {
  CampaignSummaryPanel,
  SellerCampaignPanel,
} from "@/components/CampaignPublicClient";

type Props = {
  params: Promise<{
    storeSlug: string;
    campaignSlug: string;
  }>;
  searchParams?: Promise<{
    ref?: string | string[];
    preview?: string | string[];
  }>;
};

export const revalidate = 60;
export const dynamic = "force-static";

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getCommissionEarning = (
  price: number,
  commissionValue: number
) => {
  return Math.round((price * commissionValue) / 100);
};

const getActiveCampaign = unstable_cache(
  async (storeSlug: string, campaignSlug: string) =>
    prisma.campaign.findFirst({
      where: {
        slug: campaignSlug,
        seller: {
          storeSlug,
        },
        isActive: true,
      },
      select: {
        id: true,
        sellerId: true,
        title: true,
        slug: true,
        description: true,
        bannerUrl: true,
        isActive: true,
        seller: {
          select: {
            id: true,
            name: true,
            storeSlug: true,
          },
        },
        products: {
          select: {
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                desc: true,
                imageUrls: true,
                stock: true,
                commissionValue: true,
                commissionType: true,
              },
            },
          },
        },
      },
    }),
  ["active-campaign-detail"],
  { revalidate: 60, tags: ["campaigns", "products"] }
);

export default async function CampaignPublicPage(props: Props) {
  const { storeSlug, campaignSlug } = await props.params;
  const campaign = await getActiveCampaign(storeSlug, campaignSlug);

  if (!campaign) return notFound();

  const products = campaign.products.map((cp) => cp.product);
  const isAffiliateViewer = false;
  const isSellerViewer = false;
  const isCampaignOwner = false;
  const canPromoteCampaign = false;
  const showAffiliateHighlights = isAffiliateViewer;
  const showInternalCampaignInfo = isAffiliateViewer || isSellerViewer;
  const sellerCampaignHref = `/seller/campaigns/${campaign.id}`;

  const maxCommission = products.length
    ? Math.max(...products.map((product) => Number(product.commissionValue || 0)))
    : 0;

  const maxCommissionEarning = products.length
    ? Math.max(
        ...products.map((product) =>
          getCommissionEarning(
            Number(product.price || 0),
            Number(product.commissionValue || 0)
          )
        )
      )
    : 0;

  const minPrice = products.length
    ? Math.min(...products.map((product) => Number(product.price || 0)))
    : 0;
  const clientProducts = products.map((product) => ({
    id: product.id,
    name: product.name,
    price: product.price,
    desc: product.desc,
    imageUrl: product.imageUrls?.[0] ?? null,
    stock: product.stock,
    commissionValue: product.commissionValue,
    commissionType: product.commissionType,
  }));

  return (
    <div className="min-h-screen bg-[#fffaf6] text-slate-900">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-full bg-gradient-to-b from-orange-100 via-orange-50/60 to-transparent" />
        <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        <section className="relative overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_20px_70px_-35px_rgba(0,0,0,0.25)]">
          <div className="relative min-h-[320px] md:min-h-[420px]">
            {campaign.bannerUrl ? (
              <img
                src={campaign.bannerUrl}
                alt={campaign.title}
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-orange-200 via-orange-100 to-amber-50" />
            )}

            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-8 md:min-h-[420px] md:p-12">
              <div className="max-w-3xl">
                {showInternalCampaignInfo && (
                  <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
                    Campaña activa
                  </div>
                )}

                <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                  {campaign.title}
                </h1>

                {campaign.description && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
                    {campaign.description}
                  </p>
                )}

                {showInternalCampaignInfo && (
                  <div className="mt-6 flex flex-wrap items-center gap-3">
                    <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                      {products.length} {products.length === 1 ? "producto" : "productos"}
                    </div>

                    <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                      Tienda: {campaign.seller.storeSlug || campaign.seller.name || "Store"}
                    </div>

                    {isAffiliateViewer && (
                      <div className="rounded-full bg-orange-500/90 px-4 py-2 text-sm font-semibold text-white">
                        Hasta {maxCommission}% de comision
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {showInternalCampaignInfo && (
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
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {products.length}
              </p>
              <p className="mt-1 text-sm text-slate-600">
                disponibles en esta campaña
              </p>
            </div>

            <div className="rounded-2xl bg-slate-50 p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ticket de entrada
              </p>
              <p className="mt-2 text-lg font-semibold text-slate-900">
                {products.length ? formatMoney(minPrice) : formatMoney(0)}
              </p>
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
                  {formatMoney(maxCommissionEarning)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  comision estimada por venta
                </p>
              </div>
            ) : isSellerViewer ? (
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
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Estado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Activa
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  campaña disponible para compra
                </p>
              </div>
            )}

          </div>
          </section>
        )}

        <CampaignSummaryPanel
          campaignId={campaign.id}
          sellerId={campaign.sellerId}
          products={clientProducts}
          maxCommission={maxCommission}
          maxCommissionEarningLabel={formatMoney(maxCommissionEarning)}
          minPriceLabel={products.length ? formatMoney(minPrice) : formatMoney(0)}
          sellerCampaignHref={sellerCampaignHref}
        />

        <main className="mx-auto max-w-7xl">
          <div className="pt-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
              Catalogo de campaña
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              {isAffiliateViewer
                ? "Productos listos para promocionar"
                : "Productos disponibles en la campaña"}
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600">
              {isAffiliateViewer
                ? "Elegi los productos con mejor encaje para tu audiencia y prioriza los que tienen una comision mas atractiva para maximizar tus ingresos."
                : isSellerViewer
                  ? "Revisa como se ve tu campaña publica, controla que los productos clave esten activos y que la propuesta sea clara para quienes llegan a comprar."
                  : "Explora los productos de esta campaña y elegi el que mejor encaje con lo que estas buscando."}
            </p>
          </div>

          {showInternalCampaignInfo && (
            <section
            aria-labelledby="filter-heading"
            className="mt-12 border-t border-orange-100 pt-6"
          >
            <h3 id="filter-heading" className="sr-only">
              Product filters
            </h3>

            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <div className="inline-flex items-center rounded-full border border-orange-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm">
                  {products.length} {products.length === 1 ? "producto" : "productos"}
                </div>
                {showAffiliateHighlights && (
                  <>
                    <div className="inline-flex items-center rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm font-semibold text-orange-700 shadow-sm">
                      Hasta {maxCommission}% de comision
                    </div>
                    <div className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm">
                      Ganancia potencial de hasta {formatMoney(maxCommissionEarning)}
                    </div>
                  </>
                )}
              </div>

              <div className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 shadow-sm">
                {isAffiliateViewer
                  ? "Ordenados para inspirar accion y destacar la rentabilidad"
                  : isSellerViewer
                    ? "Vista de empresa"
                    : "Catalogo publico de productos activos"}
              </div>
            </div>
            </section>
          )}

          {products.length === 0 ? (
            <section className="mt-10 rounded-[28px] border border-dashed border-orange-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  *
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  No hay productos en esta campaña
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando se agreguen productos, van a aparecer aca con un formato
                  mas visual y orientado a conversion.
                </p>
              </div>
            </section>
          ) : (
            <>
              <section
                aria-labelledby="products-heading"
                className="mt-10"
              >
                <h3 id="products-heading" className="sr-only">
                  Products
                </h3>

                <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 xl:grid-cols-3 xl:gap-x-8">
                  {products.map((product) => (
                    <CampaignProductCard
                      key={product.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        price: product.price,
                        desc: product.desc,
                        imageUrl: product.imageUrls?.[0] ?? null,
                        stock: product.stock,
                        commissionValue: showAffiliateHighlights
                          ? product.commissionValue
                          : 0,
                        commissionType: product.commissionType,
                      }}
                      showAffiliateHighlights={showAffiliateHighlights}
                      showStock={isSellerViewer}
                    />
                  ))}
                </div>
              </section>

              {showAffiliateHighlights && (
                <section
                  aria-labelledby="featured-heading"
                  className="relative mt-16 overflow-hidden rounded-[28px] lg:h-[28rem]"
                >
                  <div className="absolute inset-0">
                    {campaign.bannerUrl ? (
                      <img
                        alt={campaign.title}
                        src={campaign.bannerUrl}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full bg-gradient-to-br from-orange-200 via-orange-100 to-amber-50" />
                    )}
                  </div>
                  <div className="absolute inset-0 bg-slate-950/35" />
                  <div aria-hidden="true" className="relative h-96 w-full lg:hidden" />
                  <div aria-hidden="true" className="relative h-32 w-full lg:hidden" />
                  <div className="absolute inset-x-0 bottom-0 rounded-b-[28px] bg-black/70 p-6 backdrop-blur-sm sm:flex sm:items-center sm:justify-between lg:inset-x-auto lg:inset-y-0 lg:w-[26rem] lg:flex-col lg:items-start lg:rounded-l-[28px] lg:rounded-r-none">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-200">
                        Destacada para afiliados
                      </p>
                      <h3
                        id="featured-heading"
                        className="mt-3 text-2xl font-bold text-white"
                      >
                        Esta campaña puede dejarte hasta {formatMoney(maxCommissionEarning)} por venta
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-white/80">
                        Usa el link de afiliado de la campaña para mover trafico a una
                        seleccion de productos que ya esta pensada para convertir.
                      </p>
                    </div>
                    <div className="mt-6 flex w-full flex-col gap-3 sm:mt-0 lg:mt-6">
                      <div className="rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white">
                        {products.length} productos activos para promocionar
                      </div>
                      <div className="rounded-2xl border border-orange-300/30 bg-orange-500/90 px-4 py-3 text-sm font-semibold text-white">
                        Comision maxima de {maxCommission}%
                      </div>
                    </div>
                  </div>
                </section>
              )}

              {isSellerViewer && (
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
                        Verifica que el catalogo, el stock y la imagen de la campaña
                        esten listos antes de enviarla a afiliados o clientes. Las
                        comisiones y el link de afiliado quedan reservados para
                        usuarios con rol afiliado.
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
              )}

              <SellerCampaignPanel
                sellerId={campaign.sellerId}
                products={clientProducts}
                maxCommission={maxCommission}
                sellerCampaignHref={sellerCampaignHref}
              />

            </>
          )}
        </main>
      </div>
    </div>
  );
}
