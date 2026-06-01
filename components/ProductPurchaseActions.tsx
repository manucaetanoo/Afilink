"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import AddToCartButton from "@/components/cart/AddToCartButton";
import { BuyButton } from "@/components/BuyButton";
import type { ProductColorOption } from "@/lib/product-color";

type Props = {
  product: {
    id: string;
    name: string;
    price: number;
    imageUrl: string | null;
    sizes: string[];
    colors: ProductColorOption[];
    usesShopifyCheckout?: boolean;
  };
  refCode?: string | null;
  disabled?: boolean;
};

export default function ProductPurchaseActions({
  product,
  refCode,
  disabled = false,
}: Props) {
  const searchParams = useSearchParams();
  const [selectedSize, setSelectedSize] = useState<string | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const resolvedRefCode = refCode ?? searchParams.get("ref");
  const requiresSize = product.sizes.length > 0;
  const requiresColor = product.colors.length > 0;
  const missingSize = requiresSize && !selectedSize;
  const missingColor = requiresColor && !selectedColor;
  const actionsDisabled = disabled || missingSize || missingColor;
  const disabledReason = disabled
    ? "Sin stock"
    : missingSize
      ? "Elegir talle"
      : missingColor
        ? "Elegir color"
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

      {requiresColor && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold text-slate-950">Color</h2>
            <span className="text-xs font-medium text-slate-500">
              {product.colors.length} opciones
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {product.colors.map((color) => {
              const isSelected = selectedColor === color.name;

              return (
                <button
                  key={`${color.name}-${color.hex}`}
                  type="button"
                  onClick={() => setSelectedColor(color.name)}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    isSelected
                      ? "border-orange-500 bg-orange-50 text-orange-700 ring-2 ring-orange-100"
                      : "border-slate-200 bg-white text-slate-800 hover:border-orange-400 hover:text-orange-700"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-slate-300"
                    style={{ backgroundColor: color.hex }}
                  />
                  {color.name}
                </button>
              );
            })}
          </div>

          {missingColor && (
            <p className="mt-2 text-xs font-medium text-orange-700">
              Selecciona un color para continuar.
            </p>
          )}
        </div>
      )}

      <div
        className={`mt-7 grid gap-3 ${
          product.usesShopifyCheckout ? "" : "sm:grid-cols-2"
        }`}
      >
        <BuyButton
          productId={product.id}
          refCode={resolvedRefCode}
          selectedSize={selectedSize}
          selectedColor={selectedColor}
          disabled={actionsDisabled}
          disabledReason={disabledReason}
        />
        {!product.usesShopifyCheckout && (
          <AddToCartButton
            disabled={actionsDisabled}
            disabledLabel={disabledReason}
            product={{
              productId: product.id,
              name: product.name,
              price: product.price,
              imageUrl: product.imageUrl,
              selectedSize,
              selectedColor,
            }}
          />
        )}
      </div>
    </>
  );
}
