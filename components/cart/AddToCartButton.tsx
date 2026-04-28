"use client";

import { useState } from "react";
import { FiShoppingBag } from "react-icons/fi";
import { CartProductInput, useCart } from "@/components/cart/CartProvider";

type Props = {
  product: CartProductInput;
  className?: string;
};

export default function AddToCartButton({ product, className }: Props) {
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);

  async function handleClick() {
    await addItem(product);
    setAdded(true);
    window.setTimeout(() => setAdded(false), 1600);
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={
        className ??
        "inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
      }
    >
      <FiShoppingBag className="mr-2" />
      {added ? "Agregado" : "Anadir al carrito"}
    </button>
  );
}
