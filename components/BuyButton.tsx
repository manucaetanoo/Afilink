"use client";

import { useRouter } from "next/navigation";

export function BuyButton({ productId }: { productId: string }) {
  const router = useRouter();

  const buy = async () => {
    const r1 = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    const j1 = await r1.json();
    if (!j1.ok) return alert(j1.error ?? "Checkout error");

    const orderId = j1.order.id;

    // Pago demo
    const r2 = await fetch(`/api/orders/${orderId}/pay`, { method: "POST" });
    const j2 = await r2.json();

    // En vez de alert, redirigís:
    router.push(`/orders/${orderId}/success`);
  };

  return (
    <button
      onClick={buy}
      type="button"
      className="px-4 py-3 w-[45%] cursor-pointer border border-orange-400 bg-orange-400 hover:bg-orange-300 text-white text-sm font-medium"
    >
      Comprar
    </button>
  );
}
