import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import {
  FiBarChart2,
  FiBox,
  FiCheckCircle,
  FiClock,
  FiDollarSign,
  FiLayers,
  FiPackage,
  FiPlus,
  FiShoppingCart,
  FiTrendingUp,
  FiUsers,
} from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
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

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "short",
  }).format(date);
}

function delta(current: number, previous: number) {
  if (previous === 0) return current > 0 ? "+100%" : "0%";
  const change = ((current - previous) / previous) * 100;
  return `${change >= 0 ? "+" : ""}${change.toFixed(0)}%`;
}

function statusClasses(status: string) {
  if (status === "PAID" || status === "AVAILABLE") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }

  if (status === "CANCELED") {
    return "border-rose-200 bg-rose-50 text-rose-700";
  }

  return "border-amber-200 bg-amber-50 text-amber-700";
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    AVAILABLE: "Disponible",
    CANCELED: "Cancelada",
    PAID: "Pagada",
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
  tone?: "slate" | "orange" | "emerald" | "violet";
}) {
  const tones = {
    slate: "bg-slate-900 text-white",
    orange: "bg-orange-500 text-white",
    emerald: "bg-emerald-500 text-white",
    violet: "bg-violet-500 text-white",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
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

function ProductBar({
  label,
  value,
  max,
  detail,
}: {
  label: string;
  value: number;
  max: number;
  detail: string;
}) {
  const width = max > 0 ? Math.max((value / max) * 100, value > 0 ? 8 : 0) : 0;

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-800">{label}</p>
          <p className="mt-0.5 text-xs text-slate-500">{detail}</p>
        </div>
        <span className="text-sm font-semibold text-slate-900">{money(value)}</span>
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

export default async function SellerDashboardPage() {
  const session = await getServerSession(authOptions);

  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== "SELLER") {
    redirect("/dashboard/affiliate");
  }

  const sellerId = session.user.id;
  const now = new Date();
  const currentStart = new Date(now);
  currentStart.setDate(currentStart.getDate() - 30);
  const previousStart = new Date(now);
  previousStart.setDate(previousStart.getDate() - 60);

  const [products, campaigns, orders, settlements, productLinks, campaignLinks] =
    await Promise.all([
      prisma.product.findMany({
        where: { sellerId },
        select: {
          id: true,
          name: true,
          price: true,
          isActive: true,
          commissionValue: true,
          commissionType: true,
          createdAt: true,
          _count: { select: { links: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.campaign.findMany({
        where: { sellerId },
        select: {
          id: true,
          title: true,
          slug: true,
          isActive: true,
          startsAt: true,
          endsAt: true,
          _count: { select: { products: true, affiliateLinks: true, orders: true } },
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.order.findMany({
        where: { sellerId },
        select: {
          id: true,
          total: true,
          status: true,
          sellerAmount: true,
          affiliateAmount: true,
          platformAmount: true,
          createdAt: true,
          product: { select: { id: true, name: true } },
          affiliate: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 80,
      }),
      prisma.settlement.findMany({
        where: { sellerId },
        select: {
          id: true,
          grossAmount: true,
          platformFee: true,
          affiliateFee: true,
          netAmount: true,
          status: true,
          createdAt: true,
          order: {
            select: {
              id: true,
              product: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      prisma.affiliateLink.findMany({
        where: { product: { sellerId } },
        select: {
          id: true,
          affiliateId: true,
          productId: true,
          _count: { select: { clicks: true } },
        },
      }),
      prisma.affiliateCampaignLink.findMany({
        where: { campaign: { sellerId } },
        select: {
          id: true,
          affiliateId: true,
          _count: { select: { clicks: true } },
        },
      }),
    ]);

  const paidOrders = orders.filter((order) => order.status === "PAID");
  const currentOrders = paidOrders.filter((order) => order.createdAt >= currentStart);
  const previousOrders = paidOrders.filter(
    (order) => order.createdAt >= previousStart && order.createdAt < currentStart
  );
  const grossRevenue = paidOrders.reduce((total, order) => total + order.total, 0);
  const currentGrossRevenue = currentOrders.reduce(
    (total, order) => total + order.total,
    0
  );
  const previousGrossRevenue = previousOrders.reduce(
    (total, order) => total + order.total,
    0
  );
  const netRevenue = paidOrders.reduce(
    (total, order) => total + order.sellerAmount,
    0
  );
  const pendingSettlement = settlements
    .filter((settlement) => settlement.status === "PENDING")
    .reduce((total, settlement) => total + settlement.netAmount, 0);
  const availableSettlement = settlements
    .filter(
      (settlement) =>
        settlement.status === "AVAILABLE" || settlement.status === "PAID"
    )
    .reduce((total, settlement) => total + settlement.netAmount, 0);
  const totalClicks =
    productLinks.reduce((total, link) => total + link._count.clicks, 0) +
    campaignLinks.reduce((total, link) => total + link._count.clicks, 0);
  const activeProducts = products.filter((product) => product.isActive).length;
  const activeCampaigns = campaigns.filter((campaign) => campaign.isActive).length;
  const activeAffiliates = new Set([
    ...productLinks.map((link) => link.affiliateId),
    ...campaignLinks.map((link) => link.affiliateId),
    ...orders
      .map((order) => order.affiliate?.id ?? null)
      .filter((id): id is string => Boolean(id)),
  ]).size;
  const averageOrder = paidOrders.length > 0 ? grossRevenue / paidOrders.length : 0;
  const platformFees = paidOrders.reduce(
    (total, order) => total + order.platformAmount,
    0
  );
  const affiliateFees = paidOrders.reduce(
    (total, order) => total + order.affiliateAmount,
    0
  );

  const productStats = products
    .map((product) => {
      const productOrders = paidOrders.filter(
        (order) => order.product.id === product.id
      );
      const revenue = productOrders.reduce((total, order) => total + order.total, 0);
      const clicks = productLinks
        .filter((link) => link.productId === product.id)
        .reduce((total, link) => total + link._count.clicks, 0);

      return {
        id: product.id,
        name: product.name,
        revenue,
        orders: productOrders.length,
        clicks,
        active: product.isActive,
      };
    })
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const maxProductRevenue = Math.max(
    ...productStats.map((product) => product.revenue),
    0
  );
  const recentOrders = orders.slice(0, 6);
  const recentSettlements = settlements.slice(0, 5);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <Navbar />

      <div className="flex min-h-screen pt-16">
        <Sidebar />

        <main className="min-w-0 flex-1">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-orange-600">
                  Dashboard seller
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
                  Control comercial de tu tienda
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
                  Ventas, productos, campanas, afiliados y liquidaciones en una
                  vista lista para operar.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/seller/products/new"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
                >
                  <FiPlus />
                  Crear producto
                </Link>
                <Link
                  href="/dashboard/seller/campaigns/new"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  <FiLayers />
                  Nueva campana
                </Link>
              </div>
            </div>

            <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard
                icon={<FiDollarSign />}
                label="Ventas brutas"
                value={money(grossRevenue)}
                detail={`${delta(currentGrossRevenue, previousGrossRevenue)} vs. 30 dias previos`}
                tone="orange"
              />
              <StatCard
                icon={<FiCheckCircle />}
                label="Ingreso neto"
                value={money(netRevenue)}
                detail={`${money(platformFees)} plataforma, ${money(affiliateFees)} afiliados`}
                tone="emerald"
              />
              <StatCard
                icon={<FiShoppingCart />}
                label="Ordenes pagas"
                value={number(paidOrders.length)}
                detail={`${delta(currentOrders.length, previousOrders.length)} vs. periodo anterior`}
                tone="slate"
              />
              <StatCard
                icon={<FiClock />}
                label="Por liquidar"
                value={money(pendingSettlement)}
                detail={`${money(availableSettlement)} disponible o pagado`}
                tone="violet"
              />
            </section>

            <section
              id="affiliates"
              className="mt-6 grid scroll-mt-24 grid-cols-1 gap-4 lg:grid-cols-4"
            >
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Productos activos</p>
                  <FiPackage className="text-orange-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{number(activeProducts)}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {number(products.length)} productos creados
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Campanas activas</p>
                  <FiLayers className="text-sky-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{number(activeCampaigns)}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {number(campaigns.length)} campanas creadas
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Afiliados activos</p>
                  <FiUsers className="text-emerald-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold">
                  {number(activeAffiliates)}
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Con links, campanas o ventas
                </p>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-500">Ticket promedio</p>
                  <FiTrendingUp className="text-violet-500" />
                </div>
                <p className="mt-3 text-2xl font-semibold">{money(averageOrder)}</p>
                <p className="mt-2 text-sm text-slate-500">
                  {number(totalClicks)} clicks afiliados
                </p>
              </div>
            </section>

            <section
              id="reports"
              className="mt-6 grid scroll-mt-24 grid-cols-1 gap-4 xl:grid-cols-5"
            >
              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-3">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Productos con mas ventas
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Ranking por facturacion pagada.
                    </p>
                  </div>
                  <FiBarChart2 className="text-xl text-slate-500" />
                </div>

                <div className="mt-6 space-y-5">
                  {productStats.length === 0 ? (
                    <p className="text-sm leading-6 text-slate-500">
                      Todavia no hay productos para mostrar. Crea tu primer producto
                      para empezar a medir ventas.
                    </p>
                  ) : (
                    productStats.map((product) => (
                      <ProductBar
                        key={product.id}
                        label={product.name}
                        value={product.revenue}
                        max={maxProductRevenue}
                        detail={`${number(product.orders)} ordenes · ${number(
                          product.clicks
                        )} clicks · ${product.active ? "activo" : "inactivo"}`}
                      />
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm xl:col-span-2">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Estado operativo
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Senales rapidas para decidir que mover.
                    </p>
                  </div>
                  <FiBox className="text-xl text-orange-500" />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700">
                      Productos sin ventas
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {number(products.filter((product) => product._count.orders === 0).length)}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-sm font-medium text-slate-700">
                      Links de afiliados
                    </p>
                    <p className="mt-2 text-2xl font-semibold">
                      {number(productLinks.length + campaignLinks.length)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-orange-100 bg-orange-50 p-4">
                    <p className="text-sm leading-6 text-orange-900">
                      Si tienes clicks pero pocas ordenes, revisa precio, comision
                      afiliada y claridad de la pagina de producto.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <div
                id="orders"
                className="scroll-mt-24 rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-3"
              >
                <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">
                      Ordenes recientes
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Ultimas compras registradas en tu tienda.
                    </p>
                  </div>
                  <Link
                    href="/seller/products"
                    className="hidden text-sm font-semibold text-orange-600 hover:text-orange-700 sm:inline"
                  >
                    Ver productos
                  </Link>
                </div>

                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-5 py-3">Producto</th>
                        <th className="px-5 py-3">Afiliado</th>
                        <th className="px-5 py-3">Fecha</th>
                        <th className="px-5 py-3 text-right">Total</th>
                        <th className="px-5 py-3">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentOrders.length === 0 ? (
                        <tr>
                          <td className="px-5 py-8 text-slate-500" colSpan={5}>
                            Todavia no hay ordenes registradas.
                          </td>
                        </tr>
                      ) : (
                        recentOrders.map((order) => (
                          <tr key={order.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4 font-medium text-slate-900">
                              {order.product.name}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {order.affiliate?.name ??
                                order.affiliate?.email ??
                                "Sin afiliado"}
                            </td>
                            <td className="px-5 py-4 text-slate-600">
                              {formatDate(order.createdAt)}
                            </td>
                            <td className="px-5 py-4 text-right font-semibold">
                              {money(order.total)}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                                  order.status
                                )}`}
                              >
                                {statusLabel(order.status)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div
                id="payments"
                className="scroll-mt-24 rounded-lg border border-slate-200 bg-white shadow-sm xl:col-span-2"
              >
                <div className="border-b border-slate-100 px-5 py-4">
                  <h2 className="text-base font-semibold text-slate-950">
                    Liquidaciones
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Movimientos netos por cobrar.
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {recentSettlements.length === 0 ? (
                    <p className="px-5 py-8 text-sm text-slate-500">
                      Todavia no hay liquidaciones.
                    </p>
                  ) : (
                    recentSettlements.map((settlement) => (
                      <div
                        key={settlement.id}
                        className="flex items-start justify-between gap-4 px-5 py-4"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-slate-900">
                            {settlement.order.product.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {formatDate(settlement.createdAt)} · bruto{" "}
                            {money(settlement.grossAmount)}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <p className="font-semibold text-slate-950">
                            {money(settlement.netAmount)}
                          </p>
                          <span
                            className={`mt-2 inline-flex rounded-full border px-2 py-0.5 text-xs font-medium ${statusClasses(
                              settlement.status
                            )}`}
                          >
                            {statusLabel(settlement.status)}
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
