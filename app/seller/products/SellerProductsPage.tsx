"use client";

import { useEffect, useState } from "react";
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
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/seller/products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data.products) ? data.products : []));
  }, []);

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
      <div className="flex min-h-screen pt-16">
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
          </div>
        </main>
      </div>
    </div>
  );
}
