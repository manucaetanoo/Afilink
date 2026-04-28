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
  commissionValue: number;
  commissionType: "PERCENT" | "FIXED";
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
    <div>
      <Navbar />
      <div className="mt-15 flex min-h-screen">
        <Sidebar />

        <main className="flex-1 p-6">
          <h1 className="mb-4 text-3xl font-semibold">Mis productos</h1>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((product) => (
              <ItemSeller key={product.id} product={product} />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
