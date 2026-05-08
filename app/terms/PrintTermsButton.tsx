"use client";

export default function PrintTermsButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="font-semibold text-orange-600 underline-offset-2 hover:underline"
    >
      Ver versión para imprimir
    </button>
  );
}
