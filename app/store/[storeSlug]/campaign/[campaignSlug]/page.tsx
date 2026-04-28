import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import CampaignProductCard from "@/components/campaigns/CampaignProductCard";
import GetCampaignAffiliateLinkButton from "@/components/campaigns/GetCampaignAffiliateLinkButton";

type Props = {
  params: Promise<{
    storeSlug: string;
    campaignSlug: string;
  }>;
  searchParams?: Promise<{
    ref?: string | string[];
  }>;
};

const formatMoney = (value: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);

const getCommissionEarning = (
  price: number,
  commissionValue: number,
  commissionType: "PERCENT" | "FIXED"
) => {
  if (commissionType === "FIXED") {
    return commissionValue;
  }

  return Math.round((price * commissionValue) / 100);
};

export default async function CampaignPublicPage(props: Props) {
  const { storeSlug, campaignSlug } = await props.params;
  const resolvedSearchParams = props.searchParams
    ? await props.searchParams
    : undefined;
  const session = await getServerSession(authOptions);

  const campaign = await prisma.campaign.findFirst({
    where: {
      slug: campaignSlug,
      seller: {
        storeSlug,
      },
      isActive: true,
    },
    include: {
      seller: true,
      products: {
        include: {
          product: true,
        },
      },
    },
  });

  if (!campaign) return notFound();

  const products = campaign.products.map((cp) => cp.product);
  const hasAffiliateReferralContext = Boolean(resolvedSearchParams?.ref);
  const isAffiliateViewer = session?.user.role === "AFFILIATE";
  const canPromoteCampaign = Boolean(
    session?.user.id &&
    session.user.id !== campaign.sellerId &&
    isAffiliateViewer
  );
  const showAffiliateHighlights =
    isAffiliateViewer || !hasAffiliateReferralContext;

  const maxCommission = products.length
    ? Math.max(...products.map((product) => Number(product.commissionValue || 0)))
    : 0;

  const maxCommissionEarning = products.length
    ? Math.max(
        ...products.map((product) =>
          getCommissionEarning(
            Number(product.price || 0),
            Number(product.commissionValue || 0),
            product.commissionType
          )
        )
      )
    : 0;

  const minPrice = products.length
    ? Math.min(...products.map((product) => Number(product.price || 0)))
    : 0;

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
                <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
                  Campana activa
                </div>

                <h1 className="text-3xl font-bold tracking-tight text-white md:text-5xl">
                  {campaign.title}
                </h1>

                {campaign.description && (
                  <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 md:text-base">
                    {campaign.description}
                  </p>
                )}

                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                    {products.length} {products.length === 1 ? "producto" : "productos"}
                  </div>

                  <div className="rounded-full bg-white/15 px-4 py-2 text-sm text-white backdrop-blur">
                    Tienda: {campaign.seller.storeSlug || campaign.seller.name || "Store"}
                  </div>

                  {showAffiliateHighlights && (
                    <div className="rounded-full bg-orange-500/90 px-4 py-2 text-sm font-semibold text-white">
                      Hasta {maxCommission}% de comision
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

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
                disponibles en esta campana
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
                precio base para empezar a vender
              </p>
            </div>

            {showAffiliateHighlights ? (
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
            ) : (
              <div className="rounded-2xl bg-slate-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Estado
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-900">
                  Activa
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  campana disponible para compra
                </p>
              </div>
            )}

            {canPromoteCampaign && (
              <GetCampaignAffiliateLinkButton
                campaignId={campaign.id}
                affiliateId={session?.user.id ?? ""}
              />
            )}
          </div>
        </section>

        <main className="mx-auto max-w-7xl">
          <div className="pt-16 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-orange-600">
              Catalogo de campana
            </p>
            <h2 className="mt-4 text-4xl font-bold tracking-tight text-slate-900">
              Productos listos para promocionar
            </h2>
            <p className="mx-auto mt-4 max-w-3xl text-base leading-7 text-slate-600">
              Elegi los productos con mejor encaje para tu audiencia y prioriza los
              que tienen una comision mas atractiva para maximizar tus ingresos.
            </p>
          </div>

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
                Ordenados para inspirar accion y destacar la rentabilidad
              </div>
            </div>
          </section>

          {products.length === 0 ? (
            <section className="mt-10 rounded-[28px] border border-dashed border-orange-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  *
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  No hay productos en esta campana
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
                        commissionValue: product.commissionValue,
                        commissionType: product.commissionType,
                      }}
                      showAffiliateHighlights={showAffiliateHighlights}
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
                        Esta campana puede dejarte hasta {formatMoney(maxCommissionEarning)} por venta
                      </h3>
                      <p className="mt-3 text-sm leading-6 text-white/80">
                        Usa el link de afiliado de la campana para mover trafico a una
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
            </>
          )}
        </main>
      </div>
    </div>
  );
}
