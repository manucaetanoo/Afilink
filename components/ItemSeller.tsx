import Link from "next/link";
import { DEFAULT_PLATFORM_COMMISSION_VALUE } from "@/lib/platform-commission";
import { formatMoney, getSellerNetAmount } from "@/lib/pricing";

type Product = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  stock?: number;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
  platformCommissionValue?: number;
  platformCommissionType?: "PERCENT" | "FIXED";
  imageUrls: string[];
  isActive?: boolean;
};

export default function ItemSeller({ product, role }: { product: Product; role?: string }) {
  const isAffiliate = role === "AFFILIATE";
  const sellerNet = getSellerNetAmount({
    price: product.price,
    affiliateCommissionValue: product.commissionValue,
    affiliateCommissionType: product.commissionType,
    platformCommissionValue: product.platformCommissionValue ?? DEFAULT_PLATFORM_COMMISSION_VALUE,
    platformCommissionType: product.platformCommissionType ?? "PERCENT",
  });

  return (
    <div className="group flex min-h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-lg">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrls?.[0] ?? "https://readymadeui.com/images/product14.webp"}
          alt={product.name}
          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-950/35 to-transparent" />
      </div>

      <div className="flex flex-1 flex-col p-4">
        <div className="min-w-0">
          <h5 className="truncate text-base font-semibold text-slate-950">
            {product.name}
          </h5>
          <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
            {product.desc ?? "Sin descripcion"}
          </p>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <h6 className="mr-auto text-lg font-bold tracking-tight text-slate-950">
            ${product.price}
          </h6>
          {product.isActive !== undefined && (
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-slate-200">
              {product.isActive ? "Activo" : "Inactivo"}
            </span>
          )}
          {product.stock !== undefined && (
            <span className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-orange-100">
              Stock: {product.stock}
            </span>
          )}
        </div>

        {!isAffiliate && (
          <div className="mt-4 rounded-lg border border-emerald-100 bg-emerald-50 px-3.5 py-3">
            <p className="text-xs font-medium text-emerald-700">Ganancia neta</p>
            <p className="mt-1 text-lg font-bold tracking-tight text-emerald-950">
              {formatMoney(sellerNet.netAmount)}
            </p>
            <p className="mt-1 text-[11px] leading-4 text-emerald-700/90">
              Afiliado -{formatMoney(sellerNet.affiliateAmount)} | Plataforma -{formatMoney(sellerNet.platformAmount)}
            </p>
          </div>
        )}

        <div className="mt-auto pt-4">
          <div className="flex w-full gap-2">
            <Link
              href={`/products/${product.id}`}
              className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg bg-slate-950 px-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Ver mas
            </Link>

            {!isAffiliate && (
              <Link
                href={`/seller/products/${product.id}/edit`}
                className="inline-flex min-h-10 flex-1 items-center justify-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
              >
                Editar
              </Link>
            )}

            {isAffiliate && (
              <span className="inline-flex min-h-10 items-center whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-3 text-sm font-semibold text-orange-600">
                {product.commissionValue}% comision
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
