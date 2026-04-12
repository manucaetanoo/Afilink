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
};

export default async function CampaignPublicPage(props: Props) {
  const { storeSlug, campaignSlug } = await props.params;
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
  return (
    <div className="min-h-screen bg-[#fffaf6] text-slate-900">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-0 top-0 h-[420px] w-full bg-gradient-to-b from-orange-100 via-orange-50/60 to-transparent" />
        <div className="absolute left-[-120px] top-24 h-72 w-72 rounded-full bg-orange-200/30 blur-3xl" />
        <div className="absolute right-[-120px] top-40 h-80 w-80 rounded-full bg-amber-200/30 blur-3xl" />
      </div>

      <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8 lg:py-10">
        {/* Hero */}
        <section className="relative overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_20px_70px_-35px_rgba(0,0,0,0.25)]">
          {/* Imagen de fondo */}
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

            {/* Overlays */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/45 to-black/20" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

            {/* Contenido */}
            <div className="relative z-10 flex min-h-[320px] flex-col justify-end p-8 md:min-h-[420px] md:p-12">
              <div className="max-w-3xl">
                <div className="mb-4 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium text-white backdrop-blur">
                  Campaña activa 
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
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Card flotante de resumen */}
<section className="relative z-20 -mt-8 px-2 md:-mt-10">
  <div className="grid gap-4 rounded-[28px] border border-orange-100 bg-white/95 p-5 shadow-[0_20px_60px_-35px_rgba(249,115,22,0.35)] backdrop-blur md:grid-cols-3 md:p-6">

    {/* Productos */}
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

    {/* Store */}
    <div className="rounded-2xl bg-slate-50 p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
        Tienda
      </p>
      <p className="mt-2 text-lg font-semibold text-slate-900">
        {campaign.seller.storeSlug || campaign.seller.name}
      </p>
      <p className="mt-1 text-sm text-slate-600">
        vendedor activo en la plataforma
      </p>
    </div>

    {/* Estado campaña */}
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

  </div>
</section>

        {/* Encabezado productos */}
        <section className="mt-12">
          <div className="mb-6 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                Catálogo de campaña
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 md:text-3xl">
                Productos destacados
              </h2>
              <p className="mt-2 max-w-2xl text-sm text-slate-600 md:text-base">
                Explorá la selección disponible y encontrá los productos principales de esta campaña.
              </p>
            </div>

            <div className="text-sm text-slate-500">
              {products.length} {products.length === 1 ? "resultado" : "resultados"}
            </div>
          </div>

          {products.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-orange-200 bg-white p-12 text-center shadow-sm">
              <div className="mx-auto max-w-md">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-100 text-orange-600">
                  ✦
                </div>
                <h3 className="text-xl font-semibold text-slate-900">
                  No hay productos en esta campaña
                </h3>
                <p className="mt-2 text-sm text-slate-500">
                  Cuando se agreguen productos, van a aparecer acá con un formato más visual y atractivo.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-[28px] border border-orange-100/80 bg-white p-2 shadow-[0_10px_40px_-30px_rgba(0,0,0,0.25)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_20px_60px_-30px_rgba(249,115,22,0.30)]"
                >
                  <CampaignProductCard
                    product={{
                      id: product.id,
                      name: product.name,
                      price: product.price,
                      desc: product.desc,
                      imageUrl: product.imageUrls?.[0] ?? undefined,
                    }}
                  />
                </div>
                
              ))}
            </div>
          )}
        </section>
        <div>
          {session?.user.id && session.user.id !== campaign.sellerId && (
            <GetCampaignAffiliateLinkButton
              campaignId={campaign.id}
              affiliateId={session?.user.id ?? ""}
            />
          )}
        </div>
      </div>
    </div>
  );
}