"use client";

import { useState } from "react";

type Props = {
  campaignId: string;
  affiliateId: string;
  endpoint?: string;
};

export default function GetCampaignAffiliateLinkButton({
  campaignId,
  affiliateId,
  endpoint = "/api/affiliate-campaign-links",
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
        body: JSON.stringify({ campaignId, affiliateId }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error");

      const url: string = data.url;
      setLastUrl(url);

      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "No se pudo generar el link";
      alert(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-5 shadow-[0_20px_45px_-35px_rgba(249,115,22,0.65)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-orange-600">
            Link de afiliado
          </p>
          <h3 className="mt-2 text-lg font-semibold text-slate-900">
            Promociona esta campana
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Genera tu enlace personalizado y copialo al instante para compartir esta campana.
          </p>
        </div>

        <div className="rounded-full border border-orange-200 bg-white/80 px-3 py-1 text-xs font-medium text-orange-700">
          Afiliado
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3">
        <button
          onClick={handleClick}
          disabled={loading}
          className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading
            ? "Generando enlace..."
            : copied
              ? "Link copiado"
              : "Obtener link de afiliado"}
        </button>

        <div className="min-h-[52px] rounded-2xl border border-orange-100 bg-white/80 px-4 py-3">
          {lastUrl ? (
            <div className="space-y-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                Ultimo enlace generado
              </p>
              <p className="truncate text-sm text-slate-700">{lastUrl}</p>
            </div>
          ) : (
            <p className="text-sm text-slate-500">
              Cuando lo generes, te lo copiamos automaticamente al portapapeles.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
