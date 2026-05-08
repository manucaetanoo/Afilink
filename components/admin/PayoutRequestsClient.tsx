"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { FiCheckCircle } from "react-icons/fi";

export type PayoutRequest = {
  id: string;
  kind: "SELLER" | "AFFILIATE";
  amount: number;
  status: "PENDING" | "PAID" | "CANCELED";
  requestedAt: string;
  paidAt: string | null;
  adminNotes: string | null;
  requester: {
    name: string | null;
    email: string;
    role: string;
    payoutMethod: string | null;
    payoutHolderName: string | null;
    payoutDocumentType: string | null;
    payoutDocumentNumber: string | null;
    payoutEmail: string | null;
    payoutPhone: string | null;
    payoutCountry: string | null;
    payoutCurrency: string | null;
    bankName: string | null;
    bankAccountType: string | null;
    bankAccountNumber: string | null;
    bankAccountAlias: string | null;
    bankBranch: string | null;
    payoutNotes: string | null;
  };
};

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function kindLabel(kind: PayoutRequest["kind"]) {
  return kind === "SELLER" ? "Seller" : "Afiliado";
}

export default function PayoutRequestsClient({
  requests,
}: {
  requests: PayoutRequest[];
}) {
  const router = useRouter();
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function markPaid(request: PayoutRequest, formData: FormData) {
    setSavingId(request.id);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/payout-requests/${request.id}/pay`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adminNotes: String(formData.get("adminNotes") || ""),
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "No se pudo marcar como liquidado");
      }

      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Ocurrio un error");
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {message}
        </div>
      )}

      {requests.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-sm">
          No hay solicitudes de liquidacion pendientes.
        </div>
      ) : (
        requests.map((request) => (
          <form
            key={request.id}
            action={(formData) => markPaid(request, formData)}
            className="rounded-lg border border-slate-200 bg-white shadow-sm"
          >
            <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full border border-orange-200 bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-700">
                    {kindLabel(request.kind)}
                  </span>
                  <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Pendiente
                  </span>
                </div>
                <h2 className="mt-3 text-lg font-semibold text-slate-950">
                  {request.requester.name ?? request.requester.email}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Solicitado el {formatDate(request.requestedAt)}
                </p>
              </div>

              <div className="rounded-lg bg-emerald-50 p-4 text-right">
                <p className="text-xs font-medium text-emerald-700">A liquidar</p>
                <p className="mt-1 text-2xl font-semibold text-emerald-900">
                  {money(request.amount)}
                </p>
              </div>
            </div>

            <div className="grid gap-5 p-5 lg:grid-cols-3">
              <div className="space-y-2 text-sm text-slate-600">
                <h3 className="font-semibold text-slate-900">Datos personales</h3>
                <p>Email: {request.requester.email}</p>
                <p>
                  Documento: {request.requester.payoutDocumentType ?? "-"}{" "}
                  {request.requester.payoutDocumentNumber ?? ""}
                </p>
                <p>Titular: {request.requester.payoutHolderName ?? "-"}</p>
                <p>
                  Pais/moneda: {request.requester.payoutCountry ?? "-"} /{" "}
                  {request.requester.payoutCurrency ?? "-"}
                </p>
              </div>

              <div className="space-y-2 text-sm text-slate-600">
                <h3 className="font-semibold text-slate-900">Cobro</h3>
                <p>Metodo: {request.requester.payoutMethod ?? "-"}</p>
                <p>Email cobro: {request.requester.payoutEmail ?? "-"}</p>
                <p>Telefono: {request.requester.payoutPhone ?? "-"}</p>
                <p>Banco: {request.requester.bankName ?? "-"}</p>
                <p>Cuenta: {request.requester.bankAccountType ?? "-"}</p>
                <p>Numero: {request.requester.bankAccountNumber ?? "-"}</p>
                <p>Alias: {request.requester.bankAccountAlias ?? "-"}</p>
                <p>Sucursal: {request.requester.bankBranch ?? "-"}</p>
              </div>

              <div className="space-y-3">
                {request.requester.payoutNotes && (
                  <div className="rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-600">
                    {request.requester.payoutNotes}
                  </div>
                )}
                <label className="text-sm font-medium text-slate-700">
                  Nota admin
                  <textarea
                    name="adminNotes"
                    defaultValue={request.adminNotes ?? ""}
                    rows={4}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                    placeholder="Referencia de transferencia, comprobante, etc."
                  />
                </label>
                <button
                  type="submit"
                  disabled={savingId === request.id}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-60"
                >
                  <FiCheckCircle />
                  {savingId === request.id ? "Guardando..." : "Marcar liquidado"}
                </button>
              </div>
            </div>
          </form>
        ))
      )}
    </div>
  );
}
