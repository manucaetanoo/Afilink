"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

export default function OrderLookupForm() {
  const router = useRouter();
  const [orderId, setOrderId] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanOrderId = orderId.trim();
    if (!cleanOrderId) {
      setError("Ingresa el numero de pedido para consultar el estado.");
      return;
    }

    router.push(`/pedido/${encodeURIComponent(cleanOrderId)}`);
  }

  return (
    <form onSubmit={handleSubmit} className="mt-8 w-full max-w-xl">
      <label htmlFor="orderId" className="block text-sm font-semibold text-slate-800">
        Numero de pedido
      </label>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row">
        <input
          id="orderId"
          value={orderId}
          onChange={(event) => {
            setOrderId(event.target.value);
            setError("");
          }}
          autoComplete="off"
          placeholder="Ej: cm..."
          className="min-h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-sm text-slate-950 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        />
        <button
          type="submit"
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-slate-950 px-5 text-sm font-semibold text-white transition hover:bg-slate-800"
        >
          <Search className="h-4 w-4" />
          Consultar
        </button>
      </div>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </form>
  );
}
