import Link from "next/link";
import Image from "next/image";
import { FiDollarSign, FiStar, FiTrendingUp } from "react-icons/fi";
import { PRODUCT_CATEGORIES, normalizeProductCategory } from "@/lib/product-categories";

export type ProductCardProduct = {
  id: string;
  name: string;
  desc: string | null;
  category?: string;
  price: number;
  commissionValue: number;
  imageUrls: string[];
  affiliateCount?: number;
};

type ProductCardProps = {
  product: ProductCardProduct;
  showAffiliateHighlights?: boolean;
  showCommissionBadge?: boolean;
  primaryActionLabel?: string;
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const getCommissionLabel = (product: ProductCardProduct) => {
  return `${product.commissionValue}%`;
};

const getCommissionEarning = (product: ProductCardProduct) => {
  return Math.round((product.price * product.commissionValue) / 100);
};

export default function ProductCard({
  product,
  showAffiliateHighlights = false,
  showCommissionBadge = showAffiliateHighlights,
  primaryActionLabel = "Comprar",
}: ProductCardProps) {
  const imageUrl = product.imageUrls?.[0] ?? null;
  const categoryLabel = PRODUCT_CATEGORIES.find((category) => category.value === normalizeProductCategory(product.category))?.label ?? "Digital";
  const isInlineImage = imageUrl?.startsWith("data:") ?? false;
  const isRemoteProductImage = /^https?:\/\//i.test(imageUrl ?? "");
  const hasCommission =
    showCommissionBadge &&
    typeof product.commissionValue === "number" &&
    product.commissionValue > 0;
  const commissionLabel = getCommissionLabel(product);
  const commissionEarning = getCommissionEarning(product);
  const affiliateCount = product.affiliateCount ?? 0;
  const isSellerView = primaryActionLabel === "Ver detalle";
  const isMarketplaceView = !showAffiliateHighlights && !isSellerView;
  const sellerMetric =
    affiliateCount > 0
      ? `${affiliateCount} ${affiliateCount === 1 ? "afiliado" : "afiliados"}`
      : `${commissionLabel} comision`;
  const actionCopy = showAffiliateHighlights
    ? "Promocionar"
    : primaryActionLabel;

  return (
    <article className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-orange-200 hover:shadow-[0_22px_60px_-36px_rgba(15,23,42,0.75)]">
      <Link href={`/products/${product.id}`} className="block h-full">
        <div className="relative overflow-hidden">
          {hasCommission && (
            <div className="absolute left-3 top-3 z-10 rounded-xl bg-orange-500 px-3 py-2 text-white shadow-lg shadow-orange-500/30">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-orange-100">
                Comisión
              </p>
              <p className="mt-0.5 text-2xl font-black leading-none">
                {commissionLabel}
              </p>
            </div>
          )}

          <div className="absolute right-3 top-3 z-10 rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm ring-1 ring-slate-200">
            Activo
          </div>

          <div className="relative aspect-[4/2.35] w-full overflow-hidden bg-slate-100">
            {imageUrl && (isInlineImage || isRemoteProductImage) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imageUrl}
                alt={product.name || "Producto"}
                className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              />
            ) : imageUrl ? (
              <Image
                src={imageUrl}
                alt={product.name || "Producto"}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-cover transition duration-500 group-hover:scale-105"
              />
            ) : (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-100 via-white to-amber-50 text-sm font-medium text-slate-500">
                Sin imagen
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/30 to-transparent" />
          </div>
        </div>

        <div className="p-3.5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-100">
              <FiStar className="text-sm" />
              {categoryLabel}
            </span>
            {!isMarketplaceView && (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-600 ring-1 ring-rose-100">
                <FiTrendingUp className="text-sm" />
                {commissionLabel}
              </span>
            )}
          </div>

          <h3 className="line-clamp-2 min-h-[2.75rem] text-base font-black leading-snug text-slate-950 transition group-hover:text-orange-700">
            {product.name}
          </h3>

          {showAffiliateHighlights ? (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs font-medium text-slate-500">Precio</p>
                  <p className="mt-1 text-lg font-black tracking-tight text-slate-950">
                    {formatPrice(product.price)}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-right">
                  <p className="text-xs font-bold text-emerald-700">
                    Ganancia por venta
                  </p>
                  <p className="mt-1 text-xl font-black tracking-tight text-emerald-600">
                    {formatPrice(commissionEarning)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3 rounded-lg bg-slate-50 px-3 py-2 text-xs">
                <span className="font-medium text-slate-500">
                  Por cada venta desde tu link
                </span>
                <span className="font-black text-orange-600">
                  {commissionLabel}
                </span>
              </div>
            </div>
          ) : (
            <div className="mt-4 border-t border-slate-100 pt-3">
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">
                  {isSellerView ? "Precio" : "Precio máximo"}
                </span>
                <span className="font-bold text-slate-700">
                  {formatPrice(product.price)}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between gap-3 text-sm">
                <span className="font-medium text-slate-500">
                  {isSellerView ? "Oportunidad" : "Entrega"}
                </span>
                <span
                  className={`font-black ${
                    isSellerView ? "text-emerald-600" : "text-slate-700"
                  }`}
                >
                  {isSellerView ? sellerMetric : "Digital"}
                </span>
              </div>
            </div>
          )}

          <div className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2.5 text-sm font-semibold text-white transition group-hover:bg-orange-500">
            <FiDollarSign className="text-base" />
            {actionCopy}
          </div>
        </div>
      </Link>
    </article>
  );
}
