"use client";

import Link from "next/link";
import { useState } from "react";

type ProductCardProps = {
  product: {
    id: string;
    name: string;
    price: number;
    desc: string | null;
    imageUrl: string | null;
  };
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function CampaignProductCard({ product }: ProductCardProps) {
  const [loading, setLoading] = useState(false);

  const handleCheckout = async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: product.id,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data?.ok) {
        alert(data?.error || "No se pudo iniciar el checkout");
        return;
      }

      if (data?.checkout?.url) {
        window.location.href = data.checkout.url;
        return;
      }

      alert("El checkout no devolvio una URL valida");
    } catch (error) {
      console.error(error);
      alert("Ocurrio un error inesperado");
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="h-52 w-full overflow-hidden rounded-xl bg-gray-100">
        {product.imageUrl ? (
          <img
            src={product.imageUrl}
            alt={product.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-400">
            Sin imagen
          </div>
        )}
      </div>

      <h3 className="mt-4 text-lg font-semibold text-gray-900">
        {product.name}
      </h3>

      {product.desc ? (
        <p className="mt-2 line-clamp-2 text-sm text-gray-500">
          {product.desc}
        </p>
      ) : (
        <p className="mt-2 text-sm text-gray-400">Sin descripcion</p>
      )}

      <p className="mt-3 text-base font-semibold text-gray-900">
        {formatPrice(product.price)}
      </p>

      <div className="mt-5 flex gap-3">
        <Link
          href={`/products/${product.id}`}
          className="inline-flex flex-1 items-center justify-center rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
        >
          Ver producto
        </Link>

        <button
          onClick={handleCheckout}
          disabled={loading}
          className="inline-flex flex-1 items-center justify-center rounded-xl bg-orange-500 px-4 py-3 text-sm font-medium text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Procesando..." : "Comprar ahora"}
        </button>
      </div>
    </article>
  );
}
