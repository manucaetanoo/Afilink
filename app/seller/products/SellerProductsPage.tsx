"use client";
import { useEffect, useState } from "react";
import ItemSeller from "@/components/ItemSeller";
import Navbar from "@/components/Navbarv2";
import Sidebar from "@/components/Sidebar";

export default function SellerProductsClient({ role }: { role?: string }) {
  const [products, setProducts] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/seller/products")
      .then((res) => res.json())
      .then((data) => setProducts(data.products));
  }, []);

  return (
     <div>
        <Navbar/>
        <div className="flex min-h-screen">
          <Sidebar />
    
          <main className="flex-1 p-6">
          <h1 className="text-3xl font-semibold mb-4"> Mis productos:</h1>
            <h1 className="text-2xl font-semibold mb-4"></h1>
    
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((p) => (
                <ItemSeller key={p.id} product={p} />
              ))}
            </div>
          </main>
        </div>
        </div>
  );
}
