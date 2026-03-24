import React from 'react'
import Items from "@/components/Items"
import Sidebar from "../../components/Sidebar"
import {prisma} from "@/lib/prisma";
//import { Product } from '@prisma/client';
import Navbar from "@/components/Navbar"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import ProductCard from '@/components/ProductCard';
import ProductCardTest from '@/components/ProductCardTest';




export default async function page() {
  const products = await prisma.product.findMany({
    orderBy: { createdAt: "desc" },


  });
  const session = await getServerSession(authOptions);



      if (!session) { redirect("/login"); // si no hay sesión, lo manda al login 
      }
  
 return (
  <div>
    <Navbar/>
    <div className="flex min-h-screen">
      <Sidebar />

          <div className="bg-primary">
{/* Seccion de blog con fotos por hacer !
            <section className="bg-primary py-16 md:py-24">
                <div className="mx-auto max-w-container px-4 md:px-8">
                    <div className="flex w-full max-w-3xl flex-col">
                        <span className="text-sm font-semibold text-brand-secondary md:text-md">Our blog</span>
                        <h2 className="mt-3 text-display-md font-semibold text-primary md:text-display-lg">Resources and insights</h2>
                        <p className="mt-4 text-lg text-tertiary md:mt-6 md:text-xl">The latest industry news, interviews, technologies, and resources.</p>
                    </div>
                </div>
            </section>
 
            <section className="mx-auto flex w-full max-w-container flex-col gap-12 px-4 pb-16 md:gap-16 md:px-8 md:pb-24">
                <a
                    href="Hola"
                    className="relative hidden w-full overflow-hidden rounded-2xl outline-focus-ring select-none focus-visible:outline-2 focus-visible:outline-offset-4 md:block md:h-145 lg:h-180"
                >
                    <img src="Hola" alt="Hola" className="absolute inset-0 size-full object-cover" />
 
                    <div className="absolute inset-x-0 bottom-0 w-full bg-linear-to-t from-black/40 to-transparent pt-24">
                        <div className="flex w-full flex-col gap-6 p-8">
                            <div className="flex flex-col gap-2">
                                <div className="flex gap-4">
                                    <p className="flex-1 text-display-xs font-semibold text-white">Hola</p>
                                   
                                </div>
                                <p className="line-clamp-2 text-md text-white">Hola</p>
                            </div>
                            <div className="flex gap-6">
                                <div className="flex flex-1 gap-8">
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-semibold text-white">Written by</p>
                                        <div className="flex items-center gap-2">
                                            
                                            <p className="text-sm font-semibold text-white">Hola</p>
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <p className="text-sm font-semibold text-white">Published on</p>
                                        <div className="flex h-10 items-center">
                                            <p className="text-md font-semibold text-white">Hola</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <p className="text-sm font-semibold text-white">File under</p>
        
                                </div>
                            </div>
                        </div>
                    </div>
                </a>
                </section>
                */}
                
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-semibold mb-4"></h1>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">

        {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
     
     </div>
     </main>
     </div>
     </div>
     </div>
    );
  }
  
  //{/*<ProductCardTest />//*}