import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DM_Sans, Manrope } from "next/font/google";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PayoutRequestButton from "@/components/PayoutRequestButton";
import AffiliateLinks from "@/components/affiliate/AffiliateLinks";
import DashboardActivity from "@/components/affiliate/DashboardActivity";
import DashboardPeriodPicker from "@/components/affiliate/DashboardPeriodPicker";
import PromotionGuide from "@/components/affiliate/PromotionGuide";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAvailablePayoutAmount, getMissingPayoutFields } from "@/lib/payouts";
import { getDashboardPeriod, inDashboardPeriod, salesComparison, summarizeAffiliatePeriod } from "@/lib/affiliate-dashboard";
import s from "./dashboard.module.css";

const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--dashboard-body" });
const headingFont = Manrope({ subsets: ["latin"], variable: "--dashboard-heading" });
const money = (value: number, decimals = 0) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", minimumFractionDigits: decimals, maximumFractionDigits: decimals }).format(value);
const date = (value: Date) => new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Montevideo" }).format(value);
const commissionLabels: Record<string, string> = { PENDING: "Pago pendiente", APPROVED: "Disponible", PAID: "Cobrada", CANCELED: "Cancelada" };
const paymentLabels: Record<string, string> = { PENDING: "Solicitado", PAID: "Pagado", CANCELED: "Cancelado" };

export default async function AffiliateDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  const affiliateId = session.user.id;
  const params = await searchParams;
  const period = getDashboardPeriod(params.period);
  const currentDates = { ...(period.start ? { gte: period.start } : {}), lte: period.end };
  const previousDates = period.previousStart && period.start ? { gte: period.previousStart, lt: period.start } : null;

  // Balances deliberately use the complete history and the same eligibility calculation as the payout endpoint.
  // Read them fresh after a payout request instead of retaining the old 30-second dashboard cache.
  const [links, commissions, orders, requests, available, payoutUser, campaignClicks, previousProductClicks, previousCampaignClicks] = await Promise.all([
    prisma.affiliateLink.findMany({
      where: { affiliateId }, orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      select: { id: true, code: true, product: { select: { id: true, name: true, isActive: true } }, _count: { select: { clicks: { where: { createdAt: currentDates } } } } },
    }),
    prisma.commission.findMany({
      where: { affiliateId }, orderBy: { createdAt: "desc" },
      select: { id: true, amount: true, status: true, order: { select: { id: true, status: true, createdAt: true, product: { select: { name: true } } } }, orderItem: { select: { product: { select: { name: true } } } } },
    }),
    prisma.order.findMany({
      where: { OR: [{ affiliateId }, { items: { some: { affiliateId } } }], ...(period.previousStart ? { createdAt: { gte: period.previousStart, lte: period.end } } : { createdAt: { lte: period.end } }) },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, createdAt: true, total: true, product: { select: { name: true } }, items: { where: { affiliateId }, select: { total: true, product: { select: { name: true } } } } },
    }),
    prisma.payoutRequest.findMany({ where: { requesterId: affiliateId, kind: "AFFILIATE" }, orderBy: { requestedAt: "desc" }, select: { id: true, amount: true, status: true, requestedAt: true, paidAt: true, commissionIds: true } }),
    getAvailablePayoutAmount(affiliateId, "AFFILIATE"),
    prisma.user.findUnique({ where: { id: affiliateId }, select: {
      payoutMethod: true, payoutHolderName: true, payoutDocumentType: true, payoutDocumentNumber: true,
      payoutEmail: true, payoutPhone: true, payoutCountry: true, payoutCurrency: true,
      bankName: true, bankAccountType: true, bankAccountNumber: true, bankAccountAlias: true,
    } }),
    prisma.campaignClick.count({ where: { link: { affiliateId }, createdAt: currentDates } }),
    previousDates ? prisma.click.count({ where: { link: { affiliateId }, createdAt: previousDates } }) : Promise.resolve(0),
    previousDates ? prisma.campaignClick.count({ where: { link: { affiliateId }, createdAt: previousDates } }) : Promise.resolve(0),
  ]);

  const missingPayoutFields = payoutUser ? getMissingPayoutFields(payoutUser) : ["perfil de cobro"];
  const missingPayoutDetails = missingPayoutFields.length > 0;
  const pendingRequests = requests.filter(request => request.status === "PENDING");
  const requestedAmount = pendingRequests.reduce((sum, request) => sum + request.amount, 0);
  const reservedIds = new Set(pendingRequests.flatMap(request => request.commissionIds));
  const legacyRequest = pendingRequests.some(request => !request.commissionIds.length);
  const paid = commissions.filter(commission => commission.status === "PAID").reduce((sum, commission) => sum + commission.amount, 0);
  const clicks = links.reduce((sum, link) => sum + link._count.clicks, 0) + campaignClicks;
  const sales = orders.map(order => ({ order }));
  const performance = summarizeAffiliatePeriod(sales, commissions, clicks, period);
  const previous = summarizeAffiliatePeriod(sales, commissions, previousProductClicks + previousCampaignClicks, period, true);
  const recentCommissions = commissions.filter(commission => inDashboardPeriod(commission.order.createdAt, period));
  const recentOrders = orders.filter(order => inDashboardPeriod(order.createdAt, period));
  const periodDates = period.start ? `${date(period.start)} — ${date(period.end)}` : `Hasta el ${date(period.end)}`;
  const metric = (label: string, value: string, detail: string) => <div className={s.metric}><p>{label}</p><strong>{value}</strong><span>{detail}</span></div>;

  return (
    <div className={`${bodyFont.variable} ${headingFont.variable}`}>
      <Navbar />
      <div className="flex min-h-screen bg-white pt-16">
        <Sidebar />
        <main className={s.main}>
          <div className={s.wrap}>
            <header className={s.header}>
              <div><p className={s.eyebrow}>TU ESPACIO DE AFILIADO</p><h1>Tus enlaces. Tus resultados.</h1><p>Compartí productos, seguí tus comisiones y gestioná tus cobros.</p></div>
              <div className={s.headerActions}>
                <PromotionGuide fontClassName={`${bodyFont.variable} ${headingFont.variable}`} />
                <Link href="/products" className={s.primary}>Elegir un producto<ArrowRightIcon aria-hidden="true" /></Link>
              </div>
            </header>

            <nav aria-label="Secciones del dashboard" className={s.mobileNav}>
              <a href="#links">Mis enlaces</a><a href="#commissions">Comisiones</a><a href="#orders">Ventas</a><a href="#payments">Cobros</a>
            </nav>

            <section className={s.balances} aria-labelledby="balance-heading">
              <div className={s.available}>
                <div><h2 id="balance-heading">Disponible para cobrar</h2><p className={s.balanceAmount}>{money(available)} <span>UYU</span></p><p>Tu comisión se habilita cuando se confirma el pago de la venta.</p></div>
                <div className={s.payoutAction}>
                  {legacyRequest ? <p className={s.small}>Hay una solicitud del sistema anterior que necesita revisión del administrador para liberar nuevos cobros.</p> : missingPayoutDetails ? <><Link href="/perfil/config#datos-de-cobro" className={s.secondary}>Completá tus datos para cobrar<ArrowRightIcon aria-hidden="true" /></Link><p className={s.small}>Falta completar: {missingPayoutFields.join(", ")}.</p></> : <><PayoutRequestButton disabled={available <= 0} pending={false} idleLabel="Solicitar cobro" pendingLabel="Cobro solicitado" />{available <= 0 && <p className={s.small}>El botón se habilita cuando tengas saldo disponible.</p>}</>}

                </div>
              </div>
              <div className={s.otherBalances}>
                <div className={s.metric}>
                  <p>Cobros en proceso</p>
                  <strong>{money(requestedAmount)}</strong>
                  <span>{pendingRequests.length > 0 ? "Solicitado para transferir a tu cuenta." : "No tenés cobros en proceso."}</span>
                  {pendingRequests.length > 0 && <a href="#payments" className={s.textLink}>Ver detalle de cobros<ArrowRightIcon aria-hidden="true" /></a>}
                </div>
                {metric("Ya cobrado", money(paid), "Comisiones liquidadas de todo tu historial.")}
              </div>
              <p className={s.balanceScope}>Tus saldos y solicitudes de cobro no cambian con el filtro de tiempo. Todos los importes están en pesos uruguayos (UYU).</p>
            </section>

            <div className={s.periodBar}>
              <DashboardPeriodPicker value={period.value} />
              <p id="period-scope">{periodDates}. El filtro se aplica a los clics, ventas, comisiones y rendimiento. Tus enlaces siguen visibles.</p>
            </div>

            <section id="links" className={s.section} aria-labelledby="links-heading">
              <div className={s.sectionHeading}><div><h2 id="links-heading">Mis enlaces</h2><p>Del más nuevo al más antiguo · {links.length} {links.length === 1 ? "enlace" : "enlaces"}</p></div><Link href="/products" className={s.textLink}>Nuevo enlace<ArrowRightIcon aria-hidden="true" /></Link></div>
              <AffiliateLinks links={links.map(link => ({ id: link.id, name: link.product.name, href: `/l/${link.code}`, productHref: `/products/${link.product.id}`, clicks: link._count.clicks, active: link.product.isActive }))} periodLabel={period.label} />
            </section>

            <section id="commissions" className={s.section} aria-labelledby="commissions-heading">
              <div className={s.sectionHeading}><div><h2 id="commissions-heading">Tus comisiones</h2><p>{period.label} · Estado actual de cada comisión.</p></div></div>
              <div className={s.panel}><DashboardActivity key={`commissions-${period.value}`} empty="No hay comisiones de ventas iniciadas en este período. Podés ampliar el rango de fechas." items={recentCommissions.map(commission => ({ id: commission.id, title: commission.orderItem?.product.name ?? commission.order.product.name, detail: `${date(commission.order.createdAt)} · ${commission.order.status === "PENDING" ? "Pago pendiente" : commission.order.status === "CANCELED" ? "Venta cancelada" : "Venta pagada"}`, amount: `${money(commission.amount)} UYU`, status: commission.status, label: reservedIds.has(commission.id) && commission.status === "APPROVED" ? "Cobro solicitado" : commissionLabels[commission.status] ?? commission.status }))} /></div>
            </section>

            <section id="performance" className={s.section} aria-labelledby="performance-heading">
              <div className={s.sectionHeading}><div><h2 id="performance-heading">Rendimiento</h2><p>{period.label}</p></div></div>
              <div className={s.metrics}>
                {metric("Clics", performance.clicks.toLocaleString("es-UY"), "Clics recibidos en el período, incluidos los de campañas.")}
                {metric("Ventas pagadas", performance.sales.toLocaleString("es-UY"), period.days ? salesComparison(performance.sales, previous.sales) : "Ventas confirmadas de todo el historial.")}
                {metric("Comisiones generadas", money(performance.earnings), "De ventas pagadas. Excluye comisiones canceladas.")}
              </div>
              <details className={s.advanced}><summary>Ver métricas adicionales</summary><div className={s.extraMetrics}>
                {metric("Ventas por cada 100 clics", performance.conversion === null ? "—" : performance.conversion.toFixed(1), "Relación entre ventas pagadas y clics del período.")}
                {metric("Comisión por clic", performance.earningsPerClick === null ? "—" : money(performance.earningsPerClick, 2), "Comisiones generadas divididas por los clics recibidos.")}
              </div><p>Una venta puede venir de un clic anterior al período. Estas cifras comparan la actividad de las fechas elegidas, no necesariamente a las mismas personas.</p></details>
              <p className={s.periodNote}>Los clics usan la fecha de la visita. Las ventas y comisiones usan la fecha de creación de la compra y su estado actual de pago. Las comparaciones abarcan períodos de igual duración.</p>
            </section>

            <section id="orders" className={s.section} aria-labelledby="orders-heading">
              <div className={s.sectionHeading}><div><h2 id="orders-heading">Ventas atribuidas</h2><p>{period.label} · Incluye compras pendientes y canceladas.</p></div></div>
              <div className={s.panel}><DashboardActivity key={`orders-${period.value}`} empty="No hay ventas iniciadas en este período." items={recentOrders.map(order => ({ id: order.id, title: order.items.length ? order.items.map(item => item.product.name).join(", ") : order.product.name, detail: date(order.createdAt), amount: `${money(order.items.length ? order.items.reduce((sum, item) => sum + item.total, 0) : order.total)} UYU`, status: order.status, label: order.status === "PAID" ? "Pagada" : order.status === "CANCELED" ? "Cancelada" : "Pago pendiente" }))} /></div>
            </section>

            <section id="payments" className={s.section} aria-labelledby="payments-heading">
              <div className={s.sectionHeading}><div><h2 id="payments-heading">Historial de cobros</h2><p>Todas tus solicitudes, independientemente del período seleccionado.</p></div><Link href="/perfil/config" className={s.textLink}>Datos de cobro<ArrowRightIcon aria-hidden="true" /></Link></div>
              <div className={s.panel}><DashboardActivity empty="Todavía no solicitaste un cobro. Cuando tengas saldo habilitado, podés solicitarlo desde el resumen de arriba." items={requests.map(request => ({ id: request.id, title: "Solicitud de cobro", detail: `Solicitado: ${date(request.requestedAt)}${request.paidAt ? ` · Pagado: ${date(request.paidAt)}` : ""}`, amount: `${money(request.amount)} UYU`, status: request.status, label: paymentLabels[request.status] ?? request.status }))} /></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
