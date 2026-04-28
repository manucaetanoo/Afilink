"use client";

import { useState } from "react";
import type { Product } from "@prisma/client";

export default function ProductGallery({ product }: { product: Product }) {
  const images = product.imageUrls?.length ? product.imageUrls : ["/placeholder.png"];
  const [mainImage, setMainImage] = useState(images[0]);

  return (
    <div className="w-full lg:sticky lg:top-24">
      <div className="grid gap-3 sm:grid-cols-[72px_1fr]">
        <div className="order-2 flex gap-2 overflow-x-auto sm:order-1 sm:flex-col sm:overflow-visible">
          {images.map((url, index) => (
            <button
              key={`${url}-${index}`}
              type="button"
              onClick={() => setMainImage(url)}
              className={`h-20 w-16 shrink-0 overflow-hidden rounded-xl border bg-slate-100 transition ${
                mainImage === url
                  ? "border-orange-500 ring-2 ring-orange-100"
                  : "border-slate-200 hover:border-orange-300"
              }`}
            >
              <img
                src={url}
                alt={`${product.name} ${index + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>

        <div className="order-1 overflow-hidden rounded-2xl bg-slate-100 sm:order-2">
          <div className="aspect-[4/5] w-full">
            <img
              src={mainImage}
              alt={product.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
