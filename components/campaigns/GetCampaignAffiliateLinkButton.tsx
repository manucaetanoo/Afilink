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
    } catch (e: any) {
      alert(e?.message ?? "No se pudo generar el link");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleClick}
        disabled={loading}
        className="px-3 py-2 text-sm bg-blue-500 text-white hover:bg-blue-400 disabled:opacity-60 mt-5"
      >
        {loading ? "Generando..." : copied ? "¡Copiado!" : "Promocionar campaña"}
      </button>

      {lastUrl && (
        <span className="text-xs text-slate-500 truncate max-w-[180px]">
          {lastUrl}
        </span>
      )}
    </div>
  );
}