import Link from "next/link";
import { notFound } from "next/navigation";
import {
  FiArrowLeft,
  FiCheckCircle,
  FiDollarSign,
  FiPackage,
  FiTag,
  FiTruck,
} from "react-icons/fi";
import Navbar from "@/components/Navbar";
import ProductGallery from "@/components/ProductGallery";
import ProductPurchaseActions from "@/components/ProductPurchaseActions";
import {
  ProductAffiliatePanel,
  SellerProductNetPanel,
} from "@/components/ProductRolePanels";
import { prisma } from "@/lib/prisma";
import { getSellerNetAmount } from "@/lib/pricing";
import { unstable_cache } from "next/cache";

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

export const revalidate = 60;
export const dynamic = "force-static";

const getCachedProduct = unstable_cache(
  async (id: string) =>
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
  ["product-detail"],
  { revalidate: 60, tags: ["products"] }
);

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const product = await getCachedProduct(id);

  if (!product) notFound();

  const categoryName = categoryLabels[product.category] ?? "Producto";
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

              <SellerProductNetPanel
                sellerId={product.seller.id}
                price={product.price}
                sellerNet={sellerNet}
              />

              <ProductPurchaseActions
                disabled={!hasStock}
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

            <ProductAffiliatePanel
              productId={product.id}
              sellerId={product.seller.id}
              price={product.price}
              commissionValue={product.commissionValue}
            />

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
