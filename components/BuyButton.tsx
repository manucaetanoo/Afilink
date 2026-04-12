"use client";

export function BuyButton({ productId }: { productId: string }) {
  const buy = async () => {
    const response = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId }),
    });

    const data = await response.json();

    if (!response.ok || !data.ok) {
      return alert(data.error ?? "Checkout error");
    }

    const checkoutUrl = data.checkout?.url;

    if (!checkoutUrl) {
      return alert("No se pudo abrir el checkout");
    }

    window.location.href = checkoutUrl;
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
