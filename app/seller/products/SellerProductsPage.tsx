"use client";

import { useEffect, useState } from "react";
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

  useEffect(() => {
    fetch("/api/seller/products")
      .then((res) => res.json())
      .then((data) => setProducts(Array.isArray(data.products) ? data.products : []));
  }, []);

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

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {products.map((product) => (
                <ItemSeller key={product.id} product={product} />
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
