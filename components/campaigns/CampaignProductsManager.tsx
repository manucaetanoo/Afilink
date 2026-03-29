"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Product = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  imageUrls: string[];
  isActive: boolean;
};

type Props = {
  campaignId: string;
  linkedProducts: Product[];
  availableProducts: Product[];
};

function formatPrice(price: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    maximumFractionDigits: 0,
  }).format(price);
}

export default function CampaignProductsManager({
  campaignId,
  linkedProducts,
  availableProducts,
}: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filteredAvailable = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return availableProducts;

    return availableProducts.filter((product) => {
      return (
        product.name.toLowerCase().includes(q) ||
        product.desc?.toLowerCase().includes(q)
      );
    });
  }, [availableProducts, search]);

  async function addProduct(productId: string) {
    try {
      setLoadingId(productId);

      const res = await fetch(`/api/seller/campaigns/${campaignId}/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo agregar el producto");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error inesperado");
    } finally {
      setLoadingId(null);
    }
  }

  async function removeProduct(productId: string) {
    try {
      setLoadingId(productId);

      const res = await fetch(`/api/seller/campaigns/${campaignId}/products`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data?.error || "No se pudo quitar el producto");
        return;
      }

      router.refresh();
    } catch (error) {
      console.error(error);
      alert("Ocurrió un error inesperado");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Productos en la campaña</h2>
          <p className="mt-1 text-sm text-gray-500">
            Estos productos son los que verá el usuario dentro de esta campaña.
          </p>
        </div>

        {linkedProducts.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
            Esta campaña todavía no tiene productos asociados.
          </div>
        ) : (
          <div className="space-y-4">
            {linkedProducts.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                    {product.imageUrls?.[0] ? (
                      <img
                        src={product.imageUrls[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeProduct(product.id)}
                  disabled={loadingId === product.id}
                  className="rounded-xl border border-red-200 px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                >
                  {loadingId === product.id ? "Quitando..." : "Quitar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-5">
          <h2 className="text-xl font-semibold">Agregar productos</h2>
          <p className="mt-1 text-sm text-gray-500">
            Seleccioná productos activos de tu tienda para sumarlos a esta
            campaña.
          </p>
        </div>

        <div className="mb-4">
          <input
            type="text"
            placeholder="Buscar producto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-orange-400"
          />
        </div>

        {filteredAvailable.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 bg-gray-50 p-5 text-sm text-gray-500">
            No hay productos disponibles para agregar.
          </div>
        ) : (
          <div className="space-y-4">
            {filteredAvailable.map((product) => (
              <div
                key={product.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"
              >
                <div className="flex min-w-0 items-center gap-4">
                  <div className="h-16 w-16 overflow-hidden rounded-xl bg-gray-100">
                    {product.imageUrls?.[0] ? (
                      <img
                        src={product.imageUrls[0]}
                        alt={product.name}
                        className="h-full w-full object-cover"
                      />
                    ) : null}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">
                      {product.name}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">
                      {formatPrice(product.price)}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => addProduct(product.id)}
                  disabled={loadingId === product.id}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-orange-600 disabled:opacity-50"
                >
                  {loadingId === product.id ? "Agregando..." : "Agregar"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}