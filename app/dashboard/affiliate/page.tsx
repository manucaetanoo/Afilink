import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  FiActivity,
  FiBarChart2,
  FiClock,
  FiDollarSign,
  FiExternalLink,
  FiLink,
  FiMousePointer,
  FiShoppingBag,
  FiTrendingUp,
} from "react-icons/fi";
import Navbar from "@/components/Navbar";
import PayoutRequestButton from "@/components/PayoutRequestButton";
import Sidebar from "@/components/Sidebar";
import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

function money(value: number) {
  return new Intl.NumberFormat("es-UY", {
    style: "currency",
    currency: "UYU",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function number(value: number) {
  return new Intl.NumberFormat("es-UY").format(value);
}

function percent(value: number) {
  return `${value.toFixed(value >= 10 ? 0 : 1)}%`;
}

function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
  }).format(new Date(date));
}

function delta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
}

function statusClasses(status: string) {
  if (status === "PAID" || status === "APPROVED") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    APPROVED: "Aprobada",
    CANCELED: "Cancelada",
    PAID: "Liquidada",
    PENDING: "Pendiente",
  };

  return labels[status] ?? status;
}

function StatCard({
  icon,
  label,
  value,
  detail,
  tone = "slate",
}: {
  icon: ReactNode;
  label: string;
  value: string;
  detail: string;
  tone?: "slate" | "orange" | "emerald" | "sky";
}) {
  const tones = {
    slate: "bg-slate-900 text-white",
    orange: "bg-orange-500 text-white",
    emerald: "bg-emerald-500 text-white",
    sky: "bg-sky-500 text-white",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-3 text-2xl font-semibold tracking-tight text-slate-950">
            {value}
          </p>
        </div>
        <div className={`rounded-lg p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
      <p className="mt-4 text-sm text-slate-500">{detail}</p>
    </div>
  );
}

function MiniBar({
  label,
  value,
  max,
}: {
  label: string;
  value: number;
  max: number;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 8 : 0) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3 text-sm">
        <span className="truncate font-medium text-slate-700">{label}</span>
        <span className="text-slate-500">{number(value)}</span>
      </div>
      <div className="h-2 rounded-full bg-slate-100">
        <div
          className="h-2 rounded-full bg-orange-500"
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

const getAffiliateDashboardData = unstable_cache(
  async (affiliateId: string) => {
    const [links, campaignLinks, commissions, orderItems, pendingPayoutRequest] =
      await Promise.all([
        prisma.affiliateLink.findMany({
          where: { affiliateId },
          select: {
            id: true,
            code: true,
            createdAt: true,
            product: {
              select: {
                id: true,
                name: true,
                price: true,
                commissionValue: true,
                commissionType: true,
              },
            },
            _count: { select: { clicks: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.affiliateCampaignLink.findMany({
          where: { affiliateId },
          select: {
            id: true,
            code: true,
            createdAt: true,
            campaign: {
              select: {
                id: true,
                title: true,
                slug: true,
                isActive: true,
              },
            },
            _count: { select: { clicks: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.commission.findMany({
          where: { affiliateId },
          select: {
            id: true,
            amount: true,
            status: true,
            createdAt: true,
            order: {
              select: {
                id: true,
                total: true,
                status: true,
                campaign: { select: { title: true } },
                settlements: {
                  select: {
                    sellerId: true,
                    status: true,
                    fulfillmentStatus: true,
                  },
                },
              },
            },
            orderItem: {
              select: {
                sellerId: true,
                total: true,
                product: { select: { name: true } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.orderItem.findMany({
          where: { affiliateId },
          select: {
            id: true,
            total: true,
            affiliateAmount: true,
            createdAt: true,
            product: { select: { name: true } },
            order: { select: { status: true } },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.payoutRequest.findFirst({
          where: {
            requesterId: affiliateId,
            kind: "AFFILIATE",
            status: "PENDING",
          },
          select: { id: true },
        }),
      ]);
    return { links, campaignLinks, commissions, orderItems, pendingPayoutRequest };
  },
  ["affiliate-dashboard"],
  { revalidate: 30 }
);

export default async function AffiliateDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  const affiliateId = session.user.id;
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 60);

  const { links, campaignLinks, commissions, orderItems, pendingPayoutRequest } =
    await getAffiliateDashboardData(affiliateId);

  const productClicks = links.reduce((total, link) => total + link._count.clicks, 0);
  const campaignClicks = campaignLinks.reduce(
    (total, link) => total + link._count.clicks,
    0
  );
  const totalClicks = productClicks + campaignClicks;
  const paidItems = orderItems.filter((item) => item.order.status === "PAID");
  const totalSales = paidItems.length;
  const paidOrderCommissions = commissions.filter(
    (commission) => commission.order.status === "PAID"
  );
  const isDeliveryConfirmedForCommission = (commission: (typeof commissions)[number]) =>
    commission.order.settlements.some(
      (settlement) =>
        settlement.sellerId === commission.orderItem?.sellerId &&
        settlement.status === "AVAILABLE" &&
        settlement.fulfillmentStatus === "DELIVERED"
    );
  const availableCommission = paidOrderCommissions
    .filter(
      (commission) =>
        commission.status === "APPROVED" &&
        isDeliveryConfirmedForCommission(commission)
    )
    .reduce((total, commission) => total + commission.amount, 0);
  const retainedCommission = paidOrderCommissions
    .filter(
      (commission) =>
        commission.status === "PENDING" ||
        (commission.status === "APPROVED" &&
          !isDeliveryConfirmedForCommission(commission))
    )
    .reduce((total, commission) => total + commission.amount, 0);
  const retainedCommissionCount = paidOrderCommissions.filter(
    (commission) =>
      commission.status === "PENDING" ||
      (commission.status === "APPROVED" &&
        !isDeliveryConfirmedForCommission(commission))
  ).length;
  const paidCommission = paidOrderCommissions
    .filter((commission) => commission.status === "PAID")
    .reduce((total, commission) => total + commission.amount, 0);
  const generatedCommission = retainedCommission + availableCommission + paidCommission;

  const currentItems = paidItems.filter((item) => new Date(item.createdAt) >= currentStart);
  const previousItems = paidItems.filter(
    (item) => new Date(item.createdAt) >= previousStart && new Date(item.createdAt) < currentStart
  );
  const conversionRate = totalClicks > 0 ? (totalSales / totalClicks) * 100 : 0;
  const earningsPerClick = totalClicks > 0 ? generatedCommission / totalClicks : 0;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

  const topLinks = [
    ...links.map((link) => ({
      id: link.id,
      label: link.product.name,
      href: `${baseUrl}/l/${link.code}`,
      clicks: link._count.clicks,
      type: "Producto",
    })),
    ...campaignLinks.map((link) => ({
      id: link.id,
      label: link.campaign.title,
      href: `${baseUrl}/cl/${link.code}`,
      clicks: link._count.clicks,
      type: "Campaña",
    })),
  ]
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 5);

  const maxTopClicks = Math.max(...topLinks.map((link) => link.clicks), 0);
  const recentCommissions = commissions;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <div className="flex min-h-[calc(100vh-4rem)] pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Dashboard afiliado
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Rendimiento de tus links
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Mira tus clicks, ventas atribuidas, comisiones y los productos que
                  mejor estan convirtiendo.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <PayoutRequestButton
                  disabled={availableCommission <= 0}
                  pending={Boolean(pendingPayoutRequest)}
                />
                <Link
                  href="/products"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FiLink />
                  Generar link
                </Link>
                <Link
                  href="/campaigns"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <FiExternalLink />
                  Ver campañas
                </Link>
              </div>
            </div>

            {retainedCommission > 0 && (
              <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 px-5 py-4">
                <p className="text-sm font-medium text-amber-950">
                  Liquidacion pendiente por entrega
                </p>
                <p className="mt-1 text-sm leading-6 text-amber-900">
                  Tenes {money(retainedCommission)} retenidos en{" "}
                  {number(retainedCommissionCount)} comisiones pendientes. La
                  liquidacion del pago va a estar disponible 7 dias despues de la
                  acreditacion y cuando se confirme la entrega.

                </p>
              </div>
            )}

            <section
              id="payments"
              className="mt-8 grid scroll-mt-24 grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5"
            >
              <StatCard
                icon={<FiMousePointer />}
                label="Clicks totales"
                value={number(totalClicks)}
                detail={`${number(productClicks)} en productos, ${number(campaignClicks)} en campañas`}
                tone="orange"
              />
              <StatCard
                icon={<FiShoppingBag />}
                label="Ventas atribuidas"
                value={number(totalSales)}
                detail={`${delta(currentItems.length, previousItems.length)} vs. 30 dias previos`}
                tone="slate"
              />
              <StatCard
                icon={<FiDollarSign />}
                label="Comision generada"
                value={money(generatedCommission)}
                detail="Total entre retenido, por liquidar y ya liquidado"
                tone="emerald"
              />
              <StatCard
                icon={<FiClock />}
                label="Retenido"
                value={money(retainedCommission)}
                detail={`${number(retainedCommissionCount)} comisiones pendientes de entrega`}
                tone="slate"
              />
              <StatCard
                icon={<FiClock />}
                label="Por liquidar"
                value={money(availableCommission)}
                detail={`Disponible para retirar. ${money(paidCommission)} ya retirado`}
                tone="sky"
              />
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5 lg:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Salud comercial
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Conversion y valor generado por cada visita.
                    </p>
                  </div>
                  <FiActivity className="text-xl text-orange-500" />
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-3 sm:p-4">
                    <p className="text-sm text-slate-500">Conversion</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {percent(conversionRate)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 sm:p-4">
                    <p className="text-sm text-slate-500">Ganancia/click</p>
                    <p className="mt-2 text-2xl font-semibold">
                      {money(earningsPerClick)}
                    </p>
                  </div>
                </div>

                <div className="mt-6 rounded-lg border border-orange-100 bg-orange-50 p-3 sm:p-4">
                  <div className="flex items-start gap-3">
                    <FiTrendingUp className="mt-0.5 text-orange-600" />
                    <p className="text-sm leading-6 text-orange-900">
                      Tus mejores oportunidades son los links con mayor volumen de
                      clicks y comision generada. Tenes {money(retainedCommission)} en
                      comisiones retenidas hasta que se confirme la entrega.
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex items-center justify-between">
                  <h2 className="text-base font-semibold text-slate-950">
                    Top links
                  </h2>
                  <FiBarChart2 className="text-xl text-slate-500" />
                </div>

                <div className="mt-5 space-y-5">
                  {topLinks.length === 0 ? (
                    <p className="text-sm leading-6 text-slate-500">
                      Todavia no generaste links. Cuando compartas productos o
                      campañas, vas a ver aca tus mejores fuentes de clicks.
                    </p>
                  ) : (
                    topLinks.map((link) => (
                      <MiniBar
                        key={link.id}
                        label={`${link.type}: ${link.label}`}
                        value={link.clicks}
                        max={maxTopClicks}
                      />
                    ))
                  )}
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <div
                id="links"
                className="scroll-mt-24 rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-3"
              >
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Links recientes
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Productos y campañas que ya puedes compartir.
                    </p>
                  </div>
                  <Link
                    href="/products"
                    className="hidden text-sm font-semibold text-orange-600 hover:text-orange-700 sm:inline"
                  >
                    Nuevo link
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Origen</th>
                        <th className="px-5 py-3">Link</th>
                        <th className="px-5 py-3 text-right">Clicks</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {topLinks.length === 0 ? (
                        <tr>
                          <td className="px-5 py-8 text-slate-500" colSpan={3}>
                            No hay links todavia.
                          </td>
                        </tr>
                      ) : (
                        topLinks.map((link) => (
                          <tr key={link.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4">
                              <p className="font-medium text-slate-900">
                                {link.label}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {link.type}
                              </p>
                            </td>
                            <td className="px-5 py-4">
                              <p className="max-w-xs truncate font-mono text-xs text-slate-600">
                                {link.href}
                              </p>
                            </td>
                            <td className="px-5 py-4 text-right font-semibold">
                              {number(link.clicks)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                id="orders"
                className="scroll-mt-24 rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-2"
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2
                    id="commissions"
                    className="scroll-mt-24 text-base font-semibold text-slate-950"
                  >
                    Ultimas comisiones
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Estado de tus ventas atribuidas.
                  </p>
                </div>

                <div className="max-h-[460px] divide-y divide-slate-100 overflow-y-auto">
                  {recentCommissions.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-500">
                      Todavia no tienes comisiones registradas.
                    </p>
                  ) : (
                    recentCommissions.map((commission) => (
                      <div
                        key={commission.id}
                        className="flex items-start justify-between gap-4 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {commission.orderItem?.product.name ?? "Producto"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(commission.createdAt)} · venta{" "}
                            {money(commission.orderItem?.total ?? commission.order.total)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-slate-950">
                            {money(commission.amount)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                              commission.status
                            )}`}
                          >
                            {statusLabel(commission.status)}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
