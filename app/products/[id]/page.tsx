import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiDollarSign,
  FiPackage,
  FiShare2,
  FiTag,
  FiTruck,
} from "react-icons/fi";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import GetAffiliateLinkButton from "@/components/GetAffiliateLinkButton";
import Navbar from "@/components/Navbar";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchaseActions from "@/components/ProductPurchaseActions";
import { prisma } from "@/lib/prisma";
import { getSellerNetAmount } from "@/lib/pricing";

const categoryLabels: Record<string, string> = {
  ACCESSORIES: "Accesorios",
  BEAUTY: "Belleza",
  CLOTHING: "Ropa",
  DIGITAL: "Digital",
  HOME: "Hogar",
  OTHER: "Otro",
  SHOES: "Calzado",
};

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function commissionLabel(product: {
  commissionType: "PERCENT" | "FIXED";
  commissionValue: number;
}) {
  return `${product.commissionValue}%`;
}

function commissionEarning(product: {
  commissionType: "PERCENT" | "FIXED";
  commissionValue: number;
  price: number;
}) {
  return Math.round((product.price * product.commissionValue) / 100);
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ ref?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const refCode = resolvedSearchParams?.ref ?? null;

  const [product, session] = await Promise.all([
    prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            storeSlug: true,
          },
        },
      },
    }),
    getServerSession(authOptions),
  ]);

  if (!product) notFound();

  const userId = session?.user?.id ?? null;
  const isAffiliateViewer = session?.user?.role === "AFFILIATE";
  const isSellerOwnerViewer =
    session?.user?.role === "SELLER" && userId === product.seller.id;
  const categoryName = categoryLabels[product.category] ?? "Producto";
  const earning = commissionEarning(product);
  const hasStock = product.stock > 0;
  const sellerNet = getSellerNetAmount({
    price: product.price,
    affiliateCommissionValue: product.commissionValue,
    affiliateCommissionType: product.commissionType,
    platformCommissionValue: product.platformCommissionValue,
    platformCommissionType: product.platformCommissionType,
  });

  return (
    <div className="min-h-screen bg-[#fffaf6] text-slate-950">
      <Navbar />

      <main className="mx-auto max-w-7xl px-4 pb-16 pt-24 sm:px-6 lg:px-8">
        <Link
          href="/products"
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-orange-600"
        >
          <FiArrowLeft />
          Volver a productos
        </Link>

        <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] xl:gap-12">
          <section className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-orange-100 bg-white p-3 shadow-sm">
              <ProductGallery product={product} />
            </div>
          </section>

          <section className="min-w-0">
            <div className="rounded-2xl border border-orange-100 bg-white p-6 shadow-sm sm:p-7">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-700">
                  <FiTag />
                  {categoryName}
                </span>
                {product.isActive && hasStock && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <FiCheckCircle />
                    Disponible
                  </span>
                )}
                {!hasStock && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600">
                    <FiPackage />
                    Sin stock
                  </span>
                )}
              </div>

              <div className="mt-5">
                <h1 className="text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  {product.name}
                </h1>
                <p className="mt-4 text-base leading-7 text-slate-600">
                  {product.desc ?? "Este producto todavia no tiene descripcion."}
                </p>
              </div>

              <div className="mt-6 rounded-2xl bg-slate-50 p-5">
                <p className="text-sm font-medium text-slate-500">Precio</p>
                <p className="mt-2 text-4xl font-bold tracking-tight text-slate-950">
                  {money(product.price)}
                </p>
              </div>

              {isSellerOwnerViewer && (
                <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
                  <p className="text-sm font-semibold text-emerald-900">
                    Ganancia neta: {money(sellerNet.netAmount)}
                  </p>
                  <div className="mt-3 grid gap-3 text-sm text-emerald-950 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Afiliado
                      </p>
                      <p className="mt-1 font-semibold">
                        -{money(sellerNet.affiliateAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Plataforma
                      </p>
                      <p className="mt-1 font-semibold">
                        -{money(sellerNet.platformAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                        Precio
                      </p>
                      <p className="mt-1 font-semibold">{money(product.price)}</p>
                    </div>
                  </div>
                </div>
              )}

              <ProductPurchaseActions
                disabled={!hasStock}
                refCode={refCode}
                product={{
                  id: product.id,
                  name: product.name,
                  price: product.price,
                  imageUrl: product.imageUrls[0] ?? null,
                  sizes: product.sizes,
                }}
              />

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <FiTruck className="text-lg text-orange-500" />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Entrega coordinada
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <FiPackage className="text-lg text-orange-500" />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Producto publicado
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-white p-4">
                  <FiDollarSign className="text-lg text-orange-500" />
                  <p className="mt-2 text-xs font-medium text-slate-500">
                    Pago seguro
                  </p>
                </div>
              </div>
            </div>

            {isAffiliateViewer && userId && (
              <div className="mt-5 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm">
                <div className="p-6 sm:p-7">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
                      <FiShare2 className="text-xl" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
                        Herramienta de afiliado
                      </p>
                      <h2 className="mt-2 text-xl font-semibold text-slate-950">
                        Promociona este producto
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-slate-600">
                        Genera tu link personal, copialo automaticamente y comparte
                        este producto con tu audiencia.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="rounded-2xl border border-orange-100 bg-white p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
                        Comision
                      </p>
                      <div className="mt-2 flex flex-wrap items-end gap-2">
                        <p className="text-3xl font-bold text-slate-950">
                          {commissionLabel(product)}
                        </p>
                        <p className="pb-1 text-sm text-slate-500">
                          ganas aprox. {money(earning)} por venta
                        </p>
                      </div>
                    </div>

                    <GetAffiliateLinkButton
                      productId={product.id}
                      affiliateId={userId}
                      className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
              Vendido por{" "}
              <span className="font-semibold text-slate-950">
                {product.seller.storeSlug ?? product.seller.name ?? "Afilink seller"}
              </span>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
