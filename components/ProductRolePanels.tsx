"use client";

import { useSession } from "next-auth/react";
import { FiShare2 } from "react-icons/fi";
import GetAffiliateLinkButton from "@/components/GetAffiliateLinkButton";

type SellerNet = {
  netAmount: number;
  affiliateAmount: number;
  platformAmount: number;
};

type Props = {
  productId: string;
  sellerId: string;
  price: number;
  commissionValue: number;
  sellerNet: SellerNet;
};

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function SellerProductNetPanel({
  sellerId,
  price,
  sellerNet,
}: Pick<Props, "sellerId" | "price" | "sellerNet">) {
  const { data } = useSession();
  const user = data?.user;

  if (user?.role !== "SELLER" || user.id !== sellerId) return null;

  return (
    <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
      <p className="text-sm font-semibold text-emerald-900">
        Ganancia neta: {money(sellerNet.netAmount)}
      </p>
      <div className="mt-3 grid gap-3 text-sm text-emerald-950 sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Afiliado
          </p>
          <p className="mt-1 font-semibold">-{money(sellerNet.affiliateAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Plataforma
          </p>
          <p className="mt-1 font-semibold">-{money(sellerNet.platformAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Precio
          </p>
          <p className="mt-1 font-semibold">{money(price)}</p>
        </div>
      </div>
    </div>
  );
}

export function ProductAffiliatePanel({
  productId,
  sellerId,
  price,
  commissionValue,
}: Pick<Props, "productId" | "sellerId" | "price" | "commissionValue">) {
  const { data } = useSession();
  const user = data?.user;

  if (user?.role !== "AFFILIATE" || !user.id || user.id === sellerId) return null;

  const earning = Math.round((price * commissionValue) / 100);

  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 shadow-sm">
      <div className="p-6 sm:p-7">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-500 text-white shadow-lg shadow-orange-200">
            <FiShare2 className="text-xl" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-700">
              Herramienta de afiliado
            </p>
            <h2 className="mt-2 text-xl font-semibold text-slate-950">
              Promociona este producto
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Genera tu link personal, copialo automaticamente y comparte este producto
              con tu audiencia.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div className="rounded-2xl border border-orange-100 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-orange-700">
              Comision
            </p>
            <div className="mt-2 flex flex-wrap items-end gap-2">
              <p className="text-3xl font-bold text-slate-950">{commissionValue}%</p>
              <p className="pb-1 text-sm text-slate-500">
                ganas aprox. {money(earning)} por venta
              </p>
            </div>
          </div>

          <GetAffiliateLinkButton
            productId={productId}
            affiliateId={user.id}
            className="inline-flex w-full items-center justify-center rounded-2xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-orange-200 transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          />
        </div>
      </div>
    </div>
  );
}
