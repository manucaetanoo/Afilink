"use client";

import { useId, useRef, useState } from "react";
import { trackPurchaseStage } from "@/lib/purchase-tracking";

type BuyButtonProps = {
  productId: string;
  refCode?: string | null;
  selectedSize?: string | null;
  selectedColor?: string | null;
  className?: string;
  disabled?: boolean;
  disabledReason?: string;
};

export function BuyButton({ productId, refCode, selectedSize, selectedColor, className, disabled = false, disabledReason }: BuyButtonProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitting = useRef(false);
  const errorId = useId();

  const buy = async () => {
    if (disabled || submitting.current) return;
    submitting.current = true;
    trackPurchaseStage("buy_click", productId);
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, refCode, selectedSize, selectedColor }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok || typeof data.checkout?.url !== "string") {
        throw new Error("checkout-unavailable");
      }
      window.location.href = data.checkout.url;
    } catch {
      setError("No pudimos abrir el pago. Revisá tu conexión y volvé a intentarlo.");
      submitting.current = false;
      setPending(false);
    }
  };

  return (
    <div>
      <button
        onClick={buy}
        type="button"
        disabled={disabled || pending}
        aria-busy={pending}
        aria-describedby={error ? errorId : undefined}
        className={className ?? "inline-flex min-h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#f96f08] px-5 py-3 text-base font-semibold text-[#181917] transition hover:bg-[#ff871e] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-orange-600 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500"}
      >
        {pending && <svg aria-hidden="true" className="size-4 animate-spin motion-reduce:animate-none" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 10 10h-3a7 7 0 1 1-7-7V2Z" /></svg>}
        <span aria-live="polite">{disabled ? disabledReason ?? "No disponible" : pending ? "Abriendo pago…" : "Comprar ahora"}</span>
      </button>
      {error && <p id={errorId} role="alert" className="mt-3 text-sm leading-6 text-red-700">{error}</p>}
    </div>
  );
}
