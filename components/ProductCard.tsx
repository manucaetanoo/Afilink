import Link from "next/link";
import type { Product } from "@prisma/client";

type ProductCardProps = {
  product: Product;
  showAffiliateHighlights?: boolean;
};

const formatPrice = (amount: number) =>
  new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);

const getCommissionLabel = (product: Product) => {
  return `${product.commissionValue}%`;
};

const getCommissionEarning = (product: Product) => {
  return Math.round((product.price * product.commissionValue) / 100);
};

export default function ProductCard({
  product,
  showAffiliateHighlights = false,
}: ProductCardProps) {
  const imageUrl = product.imageUrls?.[0] ?? null;
  const hasCommission =
    showAffiliateHighlights &&
    typeof product.commissionValue === "number" &&
    product.commissionValue > 0;

  const commissionLabel = getCommissionLabel(product);
  const commissionEarning = getCommissionEarning(product);
  const hasStock = product.stock > 0;

  return (
    <article className="group overflow-hidden rounded-[28px] border border-orange-100 bg-white shadow-[0_15px_50px_-35px_rgba(15,23,42,0.45)] transition duration-300 hover:-translate-y-1.5 hover:shadow-[0_30px_80px_-35px_rgba(249,115,22,0.45)]">
      <Link
        href={`/products/${product.id}`}
        className="relative block overflow-hidden"
      >
        {hasCommission && (
          <div className="absolute inset-x-0 top-0 z-10 flex items-start justify-between gap-3 p-4">
            <div className="rounded-2xl bg-orange-500 px-4 py-3 text-white shadow-lg shadow-orange-500/30">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-100">
                Comision
              </p>
              <p className="mt-1 text-2xl font-black leading-none">
                {commissionLabel}
              </p>
              <p className="mt-1 text-xs text-white/85">por venta</p>
            </div>

            <div className="rounded-full border border-white/60 bg-white/90 px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
              Ganas {formatPrice(commissionEarning)}
            </div>
          </div>
        )}

        <div className="aspect-[4/4.6] w-full overflow-hidden bg-slate-100">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={product.name || "Producto"}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105 group-hover:opacity-90"
            />
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-orange-100 via-white to-amber-50 text-sm font-medium text-slate-500">
              Sin imagen
            </div>
          )}
        </div>

        <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-slate-950/80 to-transparent" />
      </Link>

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <Link href={`/products/${product.id}`} className="block">
              <h3 className="line-clamp-1 text-lg font-bold leading-tight text-slate-900 transition group-hover:text-orange-700">
                {product.name}
              </h3>
            </Link>

            <p className="mt-2 text-sm font-medium text-slate-500">
              Precio de venta {formatPrice(product.price)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500">
              {!hasStock && "Sin stock"}
            </p>
          </div>

          {hasCommission && (
            <div className="rounded-full bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-100">
              Ideal para afiliados
            </div>
          )}
        </div>

        <p className="mt-4 line-clamp-3 text-sm leading-6 text-slate-600">
          {product.desc ?? "Este producto no tiene descripcion todavia."}
        </p>

        {hasCommission && (
          <div className="mt-5 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50 to-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-700">
              Ganancia estimada
            </p>
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="text-2xl font-black text-slate-900">
                {formatPrice(commissionEarning)}
              </p>
              <p className="text-right text-xs leading-5 text-slate-500">
                por cada venta atribuida
              </p>
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <Link
            href={`/products/${product.id}`}
            className="inline-flex flex-1 items-center justify-center rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
          >
            Ver producto
          </Link>

          {hasStock ? (
            <Link
              href={`/products/${product.id}`}
              className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-orange-500"
            >
              Comprar
            </Link>
          ) : (
            <span className="inline-flex flex-1 items-center justify-center rounded-2xl bg-slate-200 px-4 py-3 text-sm font-semibold text-slate-500">
              Sin stock
            </span>
          )}
        </div>
      </div>
    </article>
  );
}
