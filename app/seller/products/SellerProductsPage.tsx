"use client";

import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import ItemSeller from "@/components/ItemSeller";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";

type SellerProduct = {
  id: string;
  name: string;
  desc: string | null;
  price: number;
  stock: number;
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
  platformCommissionValue: number;
  platformCommissionType: "PERCENT" | "FIXED";
  imageUrls: string[];
  isActive: boolean;
};

export default function SellerProductsClient() {
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [totalProducts, setTotalProducts] = useState(0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const loadProducts = useCallback(() => {
    fetch("/api/seller/products", { cache: "no-store" })
      .then((res) => res.json())
      .then((data) => {
        setProducts(Array.isArray(data.products) ? data.products : []);
        setTotalProducts(Number(data.total ?? 0));
        setHasMore(Boolean(data.hasMore));
      });
  }, []);

  async function loadMoreProducts() {
    setLoadingMore(true);

    try {
      const params = new URLSearchParams({
        skip: String(products.length),
        take: "100",
      });
      const res = await fetch(`/api/seller/products?${params.toString()}`, {
        cache: "no-store",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !Array.isArray(data?.products)) return;

      setProducts((current) => [...current, ...data.products]);
      setTotalProducts(Number(data.total ?? products.length + data.products.length));
      setHasMore(Boolean(data.hasMore));
    } finally {
      setLoadingMore(false);
    }
  }

  useEffect(() => {
    loadProducts();

    window.addEventListener("focus", loadProducts);
    window.addEventListener("pageshow", loadProducts);

    return () => {
      window.removeEventListener("focus", loadProducts);
      window.removeEventListener("pageshow", loadProducts);
    };
  }, [loadProducts]);

  async function handleDeleteProduct(product: Pick<SellerProduct, "id" | "name">) {
    const result = await Swal.fire({
      title: "Eliminar producto",
      text: `Seguro que queres eliminar "${product.name}"? Esta accion no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#475569",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setMessage(null);
      setDeletingProductId(product.id);

      const res = await fetch(`/api/seller/products/${product.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        const errorMessage = data?.error || "No se pudo eliminar el producto";
        setMessage(errorMessage);
        await Swal.fire({
          title: "No se pudo eliminar",
          text: errorMessage,
          icon: "error",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#0f172a",
        });
        return;
      }

      setProducts((current) => current.filter((item) => item.id !== product.id));
      setTotalProducts((current) => Math.max(current - 1, 0));
      setMessage("Producto eliminado correctamente");
      await Swal.fire({
        title: "Producto eliminado",
        text: "El producto se elimino correctamente.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });
    } catch {
      const errorMessage = "No se pudo eliminar el producto";
      setMessage(errorMessage);
      await Swal.fire({
        title: "Error",
        text: errorMessage,
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setDeletingProductId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />
      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="mb-6 border-b border-slate-200 pb-6">
              <h1 className="text-3xl font-semibold tracking-tight">Mis productos</h1>
            </div>

            {message && (
              <div className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
                {message}
              </div>
            )}

            <p className="mb-4 text-sm text-slate-500">
              Mostrando {products.length} de {totalProducts} productos
            </p>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => (
                <ItemSeller
                  key={product.id}
                  product={product}
                  deleting={deletingProductId === product.id}
                  onDelete={handleDeleteProduct}
                />
              ))}
            </div>

            {hasMore && products.length < totalProducts && (
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={loadMoreProducts}
                  disabled={loadingMore}
                  className="rounded-lg border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loadingMore ? "Cargando..." : "Cargar mas productos"}
                </button>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
