import React from 'react'

import { motion } from "motion/react";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import type { Product } from "@prisma/client";
import Link from 'next/dist/client/link';



type ItemProps = {
  product: Product;
};

const formatPrice = (amount: number) => {
  return `$${Number(amount).toFixed(2)}`;
};

export default async function Item({ product }: ItemProps) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;

  const user = userId
    ? await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, role: true },
      })
    : null;

  const imageUrl =
    product.imageUrls?.[0];

  const hasCommission =
    user?.role === "AFFILIATE" &&
    typeof product.commissionValue === "number" &&
    product.commissionValue > 0;

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg">
      {/* Imagen */}
      <Link
        href={`/products/${product.id}`}
        className="relative block aspect-[4/3] w-full overflow-hidden bg-slate-100"
      >
        <img
          src={imageUrl}
          alt={product.name || "Producto"}
          className="object-cover transition-transform duration-300 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
        />

        {hasCommission && (
          <div className="absolute left-3 top-3">
            <span className="inline-flex rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-xs font-semibold text-orange-600 shadow-sm">
              {product.commissionValue}% comisión
            </span>
          </div>
        )}
      </Link>

      {/* Contenido */}
      <div className="flex flex-1 flex-col p-4">
        <div className="flex-1">
          <Link href={`/products/${product.id}`} className="block">
            <h3 className="line-clamp-1 text-lg font-semibold text-slate-900">
              {product.name}
            </h3>
          </Link>

          <p className="mt-2 line-clamp-2 text-sm text-slate-600">
            {product.desc ?? "Sin descripción"}
          </p>

          <div className="mt-4 flex items-center justify-between gap-3">
            <span className="text-xl font-semibold text-slate-900">
              {formatPrice(product.price)}
            </span>
          </div>
        </div>

        {/* Botón */}
        <div className="mt-5">
          <Link href={`/products/${product.id}`} className="block">
            <button
              type="button"
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-md bg-orange-300 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-400"
            >
              Comprar
            </button>
          </Link>
        </div>
      </div>
    </article>
  );
}