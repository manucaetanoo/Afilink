"use client";

type BuyButtonProps = {
  productId: string;
  refCode?: string | null;
  selectedSize?: string | null;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function BuyButton({
  productId,
  refCode,
  selectedSize,
  className,
  disabled = false,
  disabledReason,
}: BuyButtonProps) {
  const buy = async () => {
    if (disabled) return;

    const response = await fetch("/api/checkout", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, refCode, selectedSize }),
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
      disabled={disabled}
      className={
        className ??
        "w-full cursor-pointer rounded-2xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none"
      }
    >
      {disabled ? disabledReason ?? "Sin stock" : "Comprar"}
    </button>
  );
}
