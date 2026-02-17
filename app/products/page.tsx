import React from 'react'
import Items from "../../components/Items"
import Sidebar from "../../components/Sidebar"
import {prisma} from "@/lib/prisma";
import { Product } from '@prisma/client';
import Navbar from "@/components/Navbar"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";



export default async function page() {
  const products = await prisma.product.findMany({
    select: { id: true, name: true, desc:true, price: true, commissionValue:true, imageUrls:true },
    orderBy: { createdAt: "desc" },


  });
  const session = await getServerSession(authOptions);



      if (!session) { redirect("/login"); // 👈 si no hay sesión, lo manda al login }
      }
  
 return (
  <div>
    <Navbar/>
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4"></h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {products.map((p) => (
            <Items key={p.id} product={p} />
          ))}
        </div>
      </main>
    </div>
    </div>
  );
}
