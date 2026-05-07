"use client";

import { useState } from "react";
import { FiShoppingBag } from "react-icons/fi";
import { CartProductInput, useCart } from "@/components/cart/CartProvider";

type Props = {
  product: CartProductInput;
  className?: string;
  disabled?: boolean;
  disabledLabel?: string;
};

export default function AddToCartButton({
  product,
  className,
  disabled = false,
  disabledLabel,
}: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  async function handleClick() {
    if (disabled) return;

    await addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      className={
        className ??
        "inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
      }
    >
      <FiShoppingBag className="mr-2" />
      {disabled ? disabledLabel ?? "Sin stock" : added ? "Agregado" : "Anadir al carrito"}
    </button>
  );
}
