"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type CartProductInput = {
  productId: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  selectedSize?: string | null;
};

export type CartItem = CartProductInput & {
  lineId: string;
  quantity: number;
  clickId?: string;
  campaignClickId?: string;
};

type CartContextValue = {
  items: CartItem[];
  totalItems: number;
  totalAmount: number;
  addItem: (product: CartProductInput) => Promise<void>;
  removeItem: (lineId: string) => void;
  updateQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | null>(null);
const STORAGE_KEY = "marketfill_cart";

function getLineId(productId: string, selectedSize?: string | null) {
  return `${productId}:${selectedSize?.trim() || "no-size"}`;
}

function readCart() {
  if (typeof window === "undefined") return [];

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || "[]");
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter((item) => item && typeof item.productId === "string")
      .map((item) => {
        const selectedSize =
          typeof item.selectedSize === "string" && item.selectedSize.trim()
            ? item.selectedSize.trim()
            : null;

        return {
          ...item,
          lineId:
            typeof item.lineId === "string"
              ? item.lineId
              : getLineId(item.productId, selectedSize),
          selectedSize,
          quantity: Math.max(1, Math.min(20, Number(item.quantity || 1))),
        } as CartItem;
      });
  } catch {
    return [];
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(() => readCart());

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback(async (product: CartProductInput) => {
    const response = await fetch("/api/cart/referral", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: product.productId }),
    });

    const referral = response.ok ? await response.json().catch(() => null) : null;

    setItems((current) => {
      const lineId = getLineId(product.productId, product.selectedSize);
      const existing = current.find((item) => item.lineId === lineId);
      const nextItem: CartItem = {
        ...product,
        lineId,
        imageUrl: product.imageUrl ?? null,
        selectedSize: product.selectedSize?.trim() || null,
        quantity: existing ? existing.quantity + 1 : 1,
        clickId: referral?.clickId || undefined,
        campaignClickId: referral?.campaignClickId || undefined,
      };

      if (!existing) return [...current, nextItem];

      return current.map((item) =>
        item.lineId === lineId
          ? {
              ...item,
              quantity: nextItem.quantity,
              clickId: item.clickId ?? nextItem.clickId,
              campaignClickId: item.campaignClickId ?? nextItem.campaignClickId,
            }
          : item
      );
    });
  }, []);

  const removeItem = useCallback((lineId: string) => {
    setItems((current) => current.filter((item) => item.lineId !== lineId));
  }, []);

  const updateQuantity = useCallback((lineId: string, quantity: number) => {
    setItems((current) =>
      current
        .map((item) =>
          item.lineId === lineId
            ? { ...item, quantity: Math.max(1, Math.min(20, quantity)) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const value = useMemo<CartContextValue>(() => {
    const totalItems = items.reduce((total, item) => total + item.quantity, 0);
    const totalAmount = items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );

    return {
      items,
      totalItems,
      totalAmount,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    };
  }, [addItem, clearCart, items, removeItem, updateQuantity]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart debe usarse dentro de CartProvider");
  return context;
}
