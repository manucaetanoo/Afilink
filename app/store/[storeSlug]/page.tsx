import Link from "next/link";
import ButtonScroll from "@/components/ButtonScroll";
import { prisma } from "@/lib/prisma";
import Navbar from "@/components/Navbar";
import { unstable_cache } from "next/cache";
import {
  StoreCampaignAffiliateAction,
  StoreProductAffiliateAction,
} from "@/components/StoreAffiliateActions";

export const revalidate = 60;
export const dynamic = "force-static";

const getCachedSellerStore = unstable_cache(
  async (storeSlug: string) =>
    prisma.user.findUnique({
      where: { storeSlug },
      select: {
        id: true,
        email: true,
        name: true,
        image: true,
        role: true,
        storeSlug: true,
        products: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 24,
          select: {
            id: true,
            name: true,
            price: true,
            commissionValue: true,
            commissionType: true,
            imageUrls: true,
          },
        },
        campaigns: {
          where: { isActive: true },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            title: true,
            slug: true,
            description: true,
            isActive: true,
            products: {
              select: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    commissionValue: true,
                    commissionType: true,
                    imageUrls: true,
                    isActive: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ["public-store-detail"],
  { revalidate: 60, tags: ["stores", "products", "campaigns"] }
);

export default async function StorePage(props: {
  params: Promise<{ storeSlug: string }>;
}) {
  const { storeSlug } = await props.params;

  const seller = await getCachedSellerStore(storeSlug);

  if (!seller || seller.role !== "SELLER") {
    return (
      <div className="min-h-screen bg-[#fffaf5] px-6 py-16 text-slate-900">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-orange-100 bg-white p-8 shadow-sm">
            <h1 className="text-2xl font-semibold">Store not found</h1>
            <p className="mt-2 text-slate-600">
              No encontramos esta tienda o no pertenece a un seller.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const isAffiliateViewer = false;

  const formatMoney = (value: number) => `$${Number(value).toFixed(0)}`;

  const getCommissionLabel = (product: {
    commissionValue: number;
    commissionType?: string | null;
  }) => {
    return `${product.commissionValue}%`;
  };

  const getEstimatedEarning = (product: {
    price: number;
    commissionValue: number;
    commissionType?: string | null;
  }) => {
    const estimated =
      (Number(product.price) * Number(product.commissionValue)) / 100;

    return `$${estimated.toFixed(0)} por venta`;
  };

  const featuredProducts = seller.products.slice(0, 3).map((product, index) => ({
    id: product.id,
    name: product.name,
    price: formatMoney(Number(product.price)),
    commission: getCommissionLabel(product),
    estimated: getEstimatedEarning(product),
    image:
      product.imageUrls?.[0] ||
      [
        "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1523275335684-37898b6baf30e?auto=format&fit=crop&w=900&q=80",
        "https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?auto=format&fit=crop&w=900&q=80",
      ][index % 3],
  }));

  const averageTicket =
    seller.products.length > 0
      ? seller.products.reduce((acc, p) => acc + Number(p.price), 0) /
      seller.products.length
      : 0;

  const metrics = [
    {
      label: "Tienda",
      value: "Publica",
    },
    {
      label: "Ticket promedio",
      value: seller.products.length ? formatMoney(averageTicket) : "—",
    },
    {
      label: "Campañas activas",
      value: String(seller.campaigns.length),
    },
    {
      label: "Productos activos",
      value: String(seller.products.length),
    },
  ];

  const sellerName = seller.name || seller.storeSlug || "Store";
  const sellerInitial = (
    seller.name?.[0] ||
    seller.storeSlug?.[0] ||
    seller.email?.[0] ||
    "S"
  ).toUpperCase();

  return (
    <div>
      <Navbar />
      <div className="min-h-screen w-full bg-[#fffaf5] text-slate-900 mt-15">
        <div className="mx-auto max-w-7xl px-6 py-8 lg:px-10">
          <header className="overflow-hidden rounded-[32px] border border-orange-100 bg-white shadow-[0_20px_60px_rgba(251,146,60,0.10)]">
            <div className="grid gap-10 bg-[radial-gradient(circle_at_top_left,rgba(251,146,60,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,237,213,0.9),transparent_30%)] px-8 py-10 lg:grid-cols-[1.3fr_0.7fr] lg:px-12 lg:py-14">
              <div>
                <div className="mb-6 inline-flex items-center gap-3 rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-700">
                  <span className="h-2 w-2 rounded-full bg-orange-500" />
                  Tienda publica
                </div>

                <div className="mb-6 flex items-center gap-4">
                  {seller.image ? (
                    <img
                      src={seller.image}
                      alt={sellerName}
                      className="h-16 w-16 rounded-2xl object-cover shadow-lg"
                    />
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-900 text-xl font-bold text-white shadow-lg">
                      {sellerInitial}
                    </div>
                  )}

                  <div>
                    <p className="text-sm uppercase tracking-[0.22em] text-slate-500">
                      Empresa destacada
                    </p>
                    <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
                      {storeSlug}
                    </h1>
                  </div>
                </div>

                <p className="max-w-2xl text-lg leading-8 text-slate-600">
                  {isAffiliateViewer
                    ? "Un espacio dentro de Afilink para que afiliados descubran, entiendan y promocionen los productos de la marca."
                    : "Explora los productos y campanas activas de esta marca dentro de Afilink."}
                </p>

                <div className="mt-8 flex flex-wrap gap-4">
                  <ButtonScroll
                    targetId="campanas"
                    label={isAffiliateViewer ? "Ver campanas" : "Ver catalogo"}
                  />

                  {isAffiliateViewer ? (
                    <ButtonScroll
                      targetId="productos"
                      label="Productos para promocionar"
                      classname="rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-orange-50"
                    />
                  ) : (
                    <Link
                      href="/products"
                      className="rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-orange-50"
                    >
                      Ver productos
                    </Link>
                  )}
                </div>
              </div>

              <div className="grid gap-4 self-start">
                {metrics.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-3xl border border-orange-100 bg-white/90 p-5 backdrop-blur"
                  >
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">
                      {item.value}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </header>

          <section className="mt-8 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-[28px] border border-orange-100 bg-white p-8 shadow-sm">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                    Sobre la marca
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold text-slate-900">
                    {isAffiliateViewer
                      ? `Por que vender productos de ${storeSlug}`
                      : `Catalogo de ${storeSlug}`}
                  </h2>
                </div>

                <span className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-sm text-orange-700">
                  Tienda pública
                </span>
              </div>

              <p className="text-base leading-8 text-slate-600">
                {storeSlug} tiene {seller.products.length}{" "}
                {seller.products.length === 1 ? "producto activo" : "productos activos"}{" "}
                dentro de Afilink.{" "}
                {isAffiliateViewer
                  ? "Los afiliados pueden descubrir que conviene promocionar, ver comisiones claras y encontrar oportunidades de venta activas."
                  : "Los visitantes pueden explorar su catalogo y entrar a sus campanas activas."}
              </p>
            </div>

            <div className="rounded-[28px] border border-orange-100 bg-white p-8 shadow-sm">
              <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                Qué ofrece este espacio
              </p>

              <div className="mt-5 space-y-4">
                {[
                  "Campanas organizadas por oportunidad de venta",
                  isAffiliateViewer
                    ? "Productos destacados listos para promocionar"
                    : "Productos destacados listos para comprar",
                  isAffiliateViewer
                    ? "Comisiones visibles antes de promocionar"
                    : "Catalogo publico con productos activos",
                  "Una pagina propia de marca dentro de tu plataforma",
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-start gap-3 rounded-2xl border border-orange-100 bg-orange-50/60 p-4"
                  >
                    <span className="mt-1 h-2.5 w-2.5 rounded-full bg-orange-500" />
                    <p className="text-slate-700">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-10" id="campanas">
            <div className="mb-6 flex items-end justify-between gap-4">
              <div>
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Núcleo del espacio
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                  Campañas activas
                </h2>
                <p className="mt-2 max-w-2xl text-slate-500">
                  {isAffiliateViewer
                    ? "Aca no mostramos solo productos. Mostramos oportunidades concretas para promocionar la marca y generar ingresos."
                    : "Explora las campanas activas y los productos asociados de esta marca."}
                </p>
              </div>
            </div>

            {seller.campaigns.length === 0 ? (
              <div className="rounded-[28px] border border-orange-100 bg-white p-8 shadow-sm">
                <h3 className="text-xl font-semibold text-slate-900">
                  Todavía no hay campañas visibles
                </h3>
                <p className="mt-2 text-slate-600">
                  Cuando esta empresa tenga campañas activas, aquí aparecerán para
                  que los afiliados puedan explorarlas.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {seller.campaigns.map((c) => {
                  const campaignProducts = c.products.map((cp) => cp.product);
                  const firstProduct = campaignProducts[0];

                  return (
                    <article
                      key={c.id}
                      className="rounded-[28px] border border-orange-100 bg-white p-6 shadow-sm transition hover:border-orange-200 hover:shadow-md"
                    >
                      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
                        <div>
                          <div className="mb-4 flex flex-wrap items-center gap-3">
                            <span className={c.isActive ? "rounded-full border border-slate-200 bg-lime-100 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-600" : "rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs uppercase tracking-[0.16em] text-slate-600"} >
                              {c.isActive ? "Activa" : "Inactiva"}

                            </span>

                            <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs text-orange-700">
                              {campaignProducts.length}{" "}
                              {campaignProducts.length === 1 ? "producto" : "productos"}
                            </span>
                          </div>

                          <h3 className="text-2xl font-semibold text-slate-900">
                            {c.title}
                          </h3>

                          <p className="mt-3 max-w-2xl leading-7 text-slate-600">
                            {c.description || "Campaña sin descripción."}
                          </p>

                          <div className="mt-5 flex flex-wrap gap-2">
                            {campaignProducts.length === 0 ? (
                              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                                Sin productos asociados
                              </span>
                            ) : (
                              campaignProducts.map((product) => (
                                <span
                                  key={product.id}
                                  className="rounded-full border border-orange-100 bg-orange-50 px-3 py-2 text-sm text-slate-700"
                                >
                                  {product.name}
                                </span>
                              ))
                            )}
                          </div>
                        </div>

                        <div className="grid gap-4 rounded-[24px] border border-orange-100 bg-[#fffaf7] p-5">
                          <div>
                            <p className="text-sm text-slate-500">Slug</p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {c.slug}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-slate-500">
                              {isAffiliateViewer ? "Desde" : "Productos"}
                            </p>
                            <p className="mt-1 text-lg font-semibold text-slate-900">
                              {isAffiliateViewer
                                ? firstProduct
                                  ? getEstimatedEarning(firstProduct)
                                  : "Sin productos"
                                : `${campaignProducts.length} disponibles`}
                            </p>
                          </div>

                          <Link
                            href={`/store/${storeSlug}/campaign/${c.slug}`}
                            className="mt-2 inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
                          >
                            Ver detalles
                          </Link>
                          <StoreCampaignAffiliateAction
                            campaignId={c.id}
                            sellerId={seller.id}
                          />
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section id="productos" className="mt-12 grid gap-8 lg:grid-cols-[1fr_0.9fr]">
            <div>
              <div className="mb-6">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  Productos destacados
                </p>
                <h2 className="mt-2 text-3xl font-semibold text-slate-900">
                  {isAffiliateViewer ? "Los mejores para promocionar" : "Productos destacados"}
                </h2>
              </div>

              {featuredProducts.length === 0 ? (
                <div className="rounded-[26px] border border-orange-100 bg-white p-8 shadow-sm">
                  <p className="text-slate-600">
                    Esta tienda todavía no tiene productos activos para mostrar.
                  </p>
                </div>
              ) : (
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {featuredProducts.map((product) => (
                    <div
                      key={product.id}
                      className="overflow-hidden rounded-[26px] border border-orange-100 bg-white shadow-sm"
                    >
                      <div className="aspect-[4/4.3] overflow-hidden bg-orange-50">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-full w-full object-cover"
                        />
                      </div>

                      <div className="p-5">
                        <h3 className="text-lg font-semibold text-slate-900">
                          {product.name}
                        </h3>

                        <div className="mt-4 space-y-2 text-sm text-slate-500">
                          <div className="flex items-center justify-between">
                            <span>Precio</span>
                            <span className="text-slate-900">{product.price}</span>
                          </div>

                          {isAffiliateViewer && (
                            <>
                              <div className="flex items-center justify-between">
                                <span>Comision</span>
                                <span className="text-slate-900">
                                  {product.commission}
                                </span>
                              </div>

                              <div className="flex items-center justify-between">
                                <span>Ganancia</span>
                                <span className="text-slate-900">
                                  {product.estimated}
                                </span>
                              </div>
                            </>
                          )}
                        </div>
                        <Link href={`/products/${product.id}`} className="mt-5 block w-full rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-center text-sm font-medium text-slate-900 transition hover:bg-orange-100">
                          Ver producto
                        </Link>
                        <StoreProductAffiliateAction
                          productId={product.id}
                          sellerId={seller.id}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-8">
              <div className="rounded-[28px] border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-8 text-slate-900 shadow-[0_20px_50px_rgba(251,146,60,0.12)]">
                <p className="text-sm uppercase tracking-[0.2em] text-slate-500">
                  {isAffiliateViewer ? "CTA final" : "Tienda publica"}
                </p>
                <h2 className="mt-2 text-3xl font-semibold leading-tight text-slate-900">
                  {isAffiliateViewer
                    ? `Unete al programa y empieza a promocionar ${sellerName}`
                    : `Explora el catalogo de ${sellerName}`}
                </h2>
                <p className="mt-3 leading-7 text-slate-600">
                  {isAffiliateViewer
                    ? "Explora campanas activas, elige productos alineados con tu audiencia y genera ingresos con comisiones claras desde el inicio."
                    : "Revisa sus productos destacados y entra a las campanas disponibles para conocer mejor la marca."}
                </p>

                <div className="mt-6 flex flex-wrap gap-4">
                  <ButtonScroll
                    targetId={isAffiliateViewer ? "campanas" : "productos"}
                    label={isAffiliateViewer ? "Quiero promocionar esta marca" : "Ver productos"}
                    classname="rounded-2xl bg-orange-500 px-6 py-3 text-sm font-medium text-white transition hover:bg-orange-600"
                  />
                  <Link
                    href="/contacto"
                    className="rounded-2xl border border-orange-200 bg-white px-6 py-3 text-sm font-medium text-slate-900 transition hover:bg-orange-50"
                  >
                    Contactar empresa
                  </Link>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
