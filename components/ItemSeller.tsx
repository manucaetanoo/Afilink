import Link from "next/link";

type Product = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
  imageUrls: string[];
};

export default function ItemSeller({ product, role }: { product: Product; role?: string }) {
  return (
    <div className="bg-white flex flex-col overflow-hidden hover:shadow-md transition-all">
      {/* Imagen */}
      <div className="w-full bg-gray-50">
        <img
          src={product.imageUrls?.[0] ?? "https://readymadeui.com/images/product14.webp"}
          alt={product.name}
          className="w-full h-48 object-cover rounded"
        />
      </div>

      {/* Contenido */}
      <div className="p-2 flex-1 flex flex-col">
        <h5 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
          {product.name}
        </h5>
        <p className="text-sm mt-1 text-slate-600 truncate">
          {product.desc ?? "Sin descripción"}
        </p>

        <div className="flex flex-wrap justify-between gap-2 mt-3">
          <h6 className="text-sm sm:text-base font-bold text-slate-900">
            ${product.price}
          </h6>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-2 mt-4">
          <Link href={`/products/${product.id}`} className="flex gap-2 w-full">
            <button
              type="button"
              className="text-sm font-medium px-2 cursor-pointer min-h-[36px] w-full bg-blue-600 hover:bg-blue-700 text-white tracking-wide outline-0 border-0 rounded-sm"
            >
              Ver más
            </button>
            {role === "AFFILIATE" && (
              <span className="inline-block bg-red-100 text-orange-600 text-sm font-semibold px-3 py-1 rounded-full border border-red-300 shadow-sm whitespace-nowrap">
                {product.commissionValue}
                {product.commissionType === "PERCENT" ? "%" : "$"} comisión 🔥
              </span>
            )}
          </Link>
        </div>
      </div>
    </div>
  );
}