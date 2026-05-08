"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Swal from "sweetalert2";

type Props = {
  campaignId: string;
  campaignTitle: string;
};

export default function DeleteCampaignButton({
  campaignId,
  campaignTitle,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const result = await Swal.fire({
      title: "Eliminar campaña",
      text: `Seguro que queres eliminar "${campaignTitle}"? Esta accion no se puede deshacer.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#475569",
      reverseButtons: true,
    });

    if (!result.isConfirmed) return;

    try {
      setLoading(true);

      const res = await fetch(`/api/seller/campaigns/${campaignId}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.ok !== true) {
        await Swal.fire({
          title: "No se pudo eliminar",
          text: data?.error || "No se pudo eliminar la campaña",
          icon: "error",
          confirmButtonText: "Entendido",
          confirmButtonColor: "#0f172a",
        });
        return;
      }

      await Swal.fire({
        title: "Campaña eliminada",
        text: "La campaña se elimino correctamente.",
        icon: "success",
        timer: 1600,
        showConfirmButton: false,
      });

      router.refresh();
    } catch {
      await Swal.fire({
        title: "Error",
        text: "No se pudo eliminar la campaña",
        icon: "error",
        confirmButtonText: "Entendido",
        confirmButtonColor: "#0f172a",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-700 transition hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
