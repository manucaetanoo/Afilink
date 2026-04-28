import Link from "next/link";

type Product = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
  imageUrls: string[];
  isActive?: boolean;
};

export default function ItemSeller({ product, role }: { product: Product; role?: string }) {
  const isAffiliate = role === "AFFILIATE";

  return (
    <div className="flex flex-col overflow-hidden bg-white transition-all hover:shadow-md">
      <div className="h-48 w-full bg-gray-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={product.imageUrls?.[0] ?? "https://readymadeui.com/images/product14.webp"}
          alt={product.name}
          className="h-full w-full rounded object-cover"
        />
      </div>

      <div className="flex flex-1 flex-col p-2">
        <h5 className="truncate text-sm font-semibold text-slate-900 sm:text-base">
          {product.name}
        </h5>
        <p className="mt-1 truncate text-sm text-slate-600">
          {product.desc ?? "Sin descripcion"}
        </p>

        <div className="mt-3 flex flex-wrap justify-between gap-2">
          <h6 className="text-sm font-bold text-slate-900 sm:text-base">
            ${product.price}
          </h6>
          {product.isActive !== undefined && (
            <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600">
              {product.isActive ? "Activo" : "Inactivo"}
            </span>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2">
          <div className="flex w-full gap-2">
            <Link
              href={`/products/${product.id}`}
              className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-sm bg-blue-600 px-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Ver mas
            </Link>

            {!isAffiliate && (
              <Link
                href={`/seller/products/${product.id}/edit`}
                className="inline-flex min-h-[36px] flex-1 items-center justify-center rounded-sm border border-slate-300 px-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Editar
              </Link>
            )}

            {isAffiliate && (
              <span className="inline-block whitespace-nowrap rounded-full border border-red-300 bg-red-100 px-3 py-1 text-sm font-semibold text-orange-600 shadow-sm">
                {product.commissionValue}
                {product.commissionType === "PERCENT" ? "%" : "$"} comision
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
