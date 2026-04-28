"use client";

type BuyButtonProps = {
  productId: string;
  className?: string;
};

export function BuyButton({ productId, className }: BuyButtonProps) {
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
      className={
        className ??
        "w-full cursor-pointer rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600"
      }
    >
      Comprar
    </button>
  );
}
