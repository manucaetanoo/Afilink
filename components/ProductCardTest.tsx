import React from 'react'
import Link from 'next/dist/client/link';


type FakeStoreProduct = {
  id: number;
  title: string;
  price: number;
  description: string;
  category: string;
  image: string;
  rating?: {
    rate: number;
    count: number;
  };
};

const formatPrice = (amount: number) => {
  return `$${Number(amount).toFixed(2)}`;
};


async function getProducts(): Promise<FakeStoreProduct[]> {
  const res = await fetch("https://fakestoreapi.com/products", {
    cache: "no-store",
  });

  if (!res.ok) {
    throw new Error("No se pudieron obtener los productos");
  }

  return res.json();
}

export default async function ProductsGrid() {
  const products = await getProducts();

  return (
   <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {products.map((product) => (
        <article
          key={product.id}
          className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
        >
          {/* Imagen */}
          <Link
            href={`/products/${product.id}`}
            className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100"
          >
            <img
              src={product.image}
              alt={product.title}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
          </Link>

          {/* Contenido */}
          <div className="flex flex-1 flex-col p-4">
            <div className="flex-1">
              <Link href={`/products/${product.id}`} className="block">
                <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">
                  {product.title}
                </h3>
              </Link>

              <p className="mt-2 line-clamp-2 text-sm text-slate-600">
                {product.description}
              </p>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xl font-semibold text-slate-900">
                  {formatPrice(product.price)}
                </span>

                {product.rating && (
                  <span className="text-sm text-slate-500">
                    ⭐ {product.rating.rate} ({product.rating.count})
                  </span>
                )}
              </div>
            </div>

            {/* Botón */}
            <div className="mt-5">
              <Link href={`/products/${product.id}`} className="block">
                <button
                  type="button"
                  className="inline-flex min-h-[42px] w-full items-center justify-center rounded-md bg-orange-300 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
                >
                  Comprar
                </button>
              </Link>
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}