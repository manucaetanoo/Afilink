"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiCreditCard } from "react-icons/fi";

export default function PayoutRequestButton({
  disabled,
  pending,
}: {
  disabled: boolean;
  pending: boolean;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function requestPayout() {
    setLoading(true);
    setMessage(null);

    try {
      const res = await fetch("/api/payout-requests", {
        method: "POST",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo solicitar la liquidacion");
      }

      setMessage("Solicitud enviada");
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrio un error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 sm:items-end">
      <button
        type="button"
        onClick={requestPayout}
        disabled={disabled || pending || loading}
        className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <FiCreditCard />
        {pending ? "Liquidacion solicitada" : loading ? "Solicitando..." : "Solicitar liquidacion"}
      </button>
      {message && (
        <p className="max-w-xs text-left text-xs leading-5 text-slate-500 sm:text-right">
          {message}
        </p>
      )}
    </div>
  );
}
