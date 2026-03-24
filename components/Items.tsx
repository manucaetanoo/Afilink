import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";




// ✅ Importá el tipo directamente de Prisma para que incluya commissionValue
import type { Product } from "@prisma/client";

export default async function Item({ product }: { product: Product }) {


  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, role:true, },
  });

  return (
    
    <div className="bg-white flex flex-col overflow-hidden hover:shadow-md transition-all rounded-lg">
      {/* Imagen */}
      <div className="w-full bg-gray-50">


        <a href={`/products/${product.id}`} >
             <img
          src={product.imageUrls[0]}
          alt={product.name}
          className="w-full h-48 object-cover rounded"
        />
        </a>
      </div>

      {/* Contenido */}
      <div className="p-2 flex-1 flex flex-col">
        <div className="flex-1">
          <a href="#" className="block border-0 outline-0">
            <h5 className="text-sm sm:text-base font-semibold text-slate-900 truncate">
              {product.name}
            </h5>
          </a>
          <p className="text-sm mt-1 text-slate-600 truncate">
            {product.desc ?? "Sin descripción"}
          </p>

          {/* Precio + rating */}
          <div className="flex flex-wrap justify-between gap-2 mt-3">
            <div className="flex gap-2">
              <h6 className="text-xl font-light text-slate-900">
                 $ {product.price}
              </h6>
            </div>

            <div className="flex items-center gap-0.5">

              {/* ...más estrellas si querés */}
            </div>
          </div>
        </div>

        {/* Botones */}
        <div className="flex items-center gap-2 mt-4">
          {/* Wishlist */}
        {/*  <div
            className="bg-pink-200 hover:bg-pink-300 w-12 h-9 flex items-center justify-center rounded-sm cursor-pointer"
            title="Wishlist"
            >
            <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16px"
            className="fill-pink-600 inline-block"
            viewBox="0 0 64 64"
            >
            <path d="M45.5 4A18.53 18.53 0 0 0 32 9.86 18.5 18.5 0 0 0 0 22.5C0 40.92 29.71 59 31 59.71a2 2 0 0 0 2.06 0C34.29 59 64 40.92 64 22.5A18.52 18.52 0 0 0 45.5 4ZM32 55.64C26.83 52.34 4 36.92 4 22.5a14.5 14.5 0 0 1 26.36-8.33 2 2 0 0 0 3.27 0A14.5 14.5 0 0 1 60 22.5c0 14.41-22.83 29.83-28 33.14Z" />
            </svg>
            
            </div>*/}

          {/* Ver más + comisión */}
          <Link href={"/products/" + product.id} className="flex gap-2 w-full">
            <button
              type="button"
              className="text-sm font-medium px-2 cursor-pointer min-h-[36px] w-full bg-blue-600 hover:bg-blue-700 text-white tracking-wide outline-0 border-0 rounded-sm"
            >
              Ver más
            </button>
          {user?.role === "AFFILIATE" && ( <> <span className="inline-block bg-red-100 text-orange-600 text-sm font-semibold px-3 py-1 rounded-full border border-red-300 shadow-sm whitespace-nowrap">
              {product.commissionValue}% comisión 🔥
            </span></> )}
           
          </Link>
        </div>
      </div>
    </div>
  );
}
