"use client";

import { useState } from "react";

type Props = {
  productId: string;
  affiliateId: string;
  endpoint?: string;
  className?: string;
};

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo generar el link";
}

export default function GetAffiliateLinkButton({
  productId,
  affiliateId,
  endpoint = "/api/affiliate-links",
  className,
}: Props) {
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function handleClick() {
    try {
      setLoading(true);
      setCopied(false);

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId, affiliateId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error");

      const url: string = data.url;
      setLastUrl(url);

      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e: unknown) {
      alert(getErrorMessage(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          "inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        }
      >
        {loading
          ? "Generando..."
          : copied
            ? "Copiado"
            : "Promocionar este producto"}
      </button>

      {lastUrl && (
        <p className="truncate rounded-xl border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-500">
          {lastUrl}
        </p>
      )}
    </div>
  );
}
