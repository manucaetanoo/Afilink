"use client";

import { useState } from "react";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { BuyButton } from "@/components/BuyButton";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    sizes: string[];
  };
  refCode?: string | null;
  disabled?: boolean;
};

export default function ProductPurchaseActions({
  product,
  refCode,
  disabled = false,
}: Props) {
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const requiresSize = product.sizes.length > 0;
  const missingSize = requiresSize && !selectedSize;
  const actionsDisabled = disabled || missingSize;
  const disabledReason = disabled
    ? "Sin stock"
    : missingSize
      ? "Elegí un talle"
      : undefined;

  return (
    <>
      {requiresSize && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-950">Talle</h2>
            <span className="text-xs font-medium text-slate-500">
              {product.sizes.length} opciones
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((size) => {
              const isSelected = selectedSize === size;

              return (
                <button
                  key={size}
                  type="button"
                  onClick={() => setSelectedSize(size)}
                  className={`min-w-12 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-100"
                      : "border-slate-200 bg-white text-slate-800 hover:border-orange-400 hover:text-orange-700"
                  }`}
                >
                  {size}
                </button>
              );
            })}
          </div>

          {missingSize && (
            <p className="mt-2 text-xs font-medium text-orange-700">
              Selecciona un talle para continuar.
            </p>
          )}
        </div>
      )}

      <div className="mt-7 grid gap-3 sm:grid-cols-2">
        <BuyButton
          productId={product.id}
          refCode={refCode}
          selectedSize={selectedSize}
          disabled={actionsDisabled}
          disabledReason={disabledReason}
        />
        <AddToCartButton
          disabled={actionsDisabled}
          disabledLabel={disabledReason}
          product={{
            productId: product.id,
            name: product.name,
            price: product.price,
            imageUrl: product.imageUrl,
            selectedSize,
          }}
        />
      </div>
    </>
  );
}
