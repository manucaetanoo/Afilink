
"use client";

import { useState } from "react";
import { Product } from "@prisma/client"; export default function ProductGallery({ product }: { product: Product }) { // ojo: si usás `select` en el server, puede que no tengas todos los campos 
const [mainImage, setMainImage] = useState(product.imageUrls?.[0] ?? "/placeholder.png");

  return (
    <div className="w-full lg:sticky top-0">
      {product.imageUrls?.length ? (
        <div className="flex flex-row gap-2">
          {/* Miniaturas */}
          <div className="flex flex-col gap-2 w-16 shrink-0">
            {product.imageUrls.map((url, idx) => (
              <img
                key={url}
                src={url}
                alt={`${product.name} ${idx + 1}`}
                className={`aspect-[64/85] object-cover w-full border rounded cursor-pointer 
                  ${mainImage === url ? "border-orange-400" : ""}`}
                onClick={() => setMainImage(url)}
              />
            ))}
          </div>

          {/* Imagen principal */}
          <div className="flex-1">
            <img src={mainImage} alt={product.name} className="w-full h-full object-cover rounded" />
          </div>
        </div>
      ) : (
        <img src="/placeholder.png" alt={product.name} className="w-full h-full object-cover rounded" />
      )}
    </div>
  );
}
