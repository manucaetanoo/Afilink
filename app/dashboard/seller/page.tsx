import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { DM_Sans, Manrope } from "next/font/google";
import { ArrowRightIcon } from "@heroicons/react/24/solid";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import PayoutRequestButton from "@/components/PayoutRequestButton";
import DashboardActivity from "@/components/affiliate/DashboardActivity";
import DashboardPeriodPicker from "@/components/affiliate/DashboardPeriodPicker";
import { prisma } from "@/lib/prisma";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { getAvailablePayoutAmount, getMissingPayoutFields } from "@/lib/payouts";
import { getDashboardPeriod, getDashboardClickDates, getSellerProductLinkScope, inDashboardPeriod, salesComparison } from "@/lib/affiliate-dashboard";
import s from "../affiliate/dashboard.module.css";

const bodyFont = DM_Sans({ subsets: ["latin"], variable: "--dashboard-body" });
const headingFont = Manrope({ subsets: ["latin"], variable: "--dashboard-heading" });
const money = (value: number) => new Intl.NumberFormat("es-UY", { style: "currency", currency: "UYU", maximumFractionDigits: 0 }).format(value);
const date = (value: Date) => new Intl.DateTimeFormat("es-UY", { day: "2-digit", month: "short", year: "numeric", timeZone: "America/Montevideo" }).format(value);
const paymentLabels: Record<string, string> = { PENDING: "Solicitado", PAID: "Pagado", CANCELED: "Cancelado" };

export default async function SellerDashboardPage({ searchParams }: { searchParams: Promise<{ period?: string | string[] }> }) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "SELLER") redirect("/dashboard/affiliate");
  const sellerId = session.user.id;
  const period = getDashboardPeriod((await searchParams).period);
  const currentDates = getDashboardClickDates(period);
  const historyDates = { ...(period.previousStart ? { gte: period.previousStart } : {}), lte: period.end };
  // Period metrics are complete; withdrawable balances always use the payout endpoint's rules.
  const [products, settlements, productLinks, requests, available, paidTotal, payoutUser] = await Promise.all([
    prisma.product.findMany({ where: { sellerId }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, price: true, isActive: true } }),
    prisma.settlement.findMany({
      where: { sellerId, order: { status: "PAID", createdAt: historyDates }, status: { not: "CANCELED" } },
      orderBy: { createdAt: "desc" },
      select: { id: true, grossAmount: true, netAmount: true, platformFee: true, affiliateFee: true, status: true, fulfillmentStatus: true,
        order: { select: { id: true, createdAt: true, buyerName: true, buyerEmail: true, buyerPhone: true,
          items: { where: { sellerId }, select: { total: true, quantity: true, affiliateId: true, product: { select: { id: true, name: true } } } } } },
      },
    }),
    prisma.affiliateLink.findMany({ where: getSellerProductLinkScope(sellerId), select: { affiliateId: true, productId: true, _count: { select: { clicks: { where: { createdAt: currentDates } } } } } }),
    prisma.payoutRequest.findMany({ where: { requesterId: sellerId, kind: "SELLER" }, orderBy: { requestedAt: "desc" }, select: { id: true, amount: true, status: true, requestedAt: true, paidAt: true, settlementIds: true } }),
    getAvailablePayoutAmount(sellerId, "SELLER"),
    prisma.settlement.aggregate({ where: { sellerId, status: "PAID" }, _sum: { netAmount: true } }),
    prisma.user.findUnique({ where: { id: sellerId }, select: { payoutMethod: true, payoutHolderName: true, payoutDocumentType: true, payoutDocumentNumber: true, payoutEmail: true, payoutPhone: true, payoutCountry: true, payoutCurrency: true, bankName: true, bankAccountType: true, bankAccountNumber: true, bankAccountAlias: true } }),
  ]);
  const current = settlements.filter(row => inDashboardPeriod(row.order.createdAt, period));
  const previous = settlements.filter(row => inDashboardPeriod(row.order.createdAt, period, true));
  const pendingRequests = requests.filter(row => row.status === "PENDING");
  const requestedAmount = pendingRequests.reduce((sum, row) => sum + row.amount, 0);
  const reservedIds = new Set(pendingRequests.flatMap(row => row.settlementIds));
  const legacyRequest = pendingRequests.some(row => !row.settlementIds.length);
  const missing = payoutUser ? getMissingPayoutFields(payoutUser) : ["perfil de cobro"];
  const gross = current.reduce((sum, row) => sum + row.grossAmount, 0);
  const net = current.reduce((sum, row) => sum + row.netAmount, 0);
  const clicks = productLinks.reduce((sum, row) => sum + row._count.clicks, 0);
  const affiliatesWithSales = new Set(current.flatMap(row => row.order.items.map(item => item.affiliateId).filter(Boolean))).size;
  const productStats = products.map(product => {
    const sales = current.filter(row => row.order.items.some(item => item.product.id === product.id));
    return { ...product, revenue: sales.reduce((sum, row) => sum + row.order.items.filter(item => item.product.id === product.id).reduce((total, item) => total + item.total, 0), 0), sales: sales.length };
  }).sort((a, b) => b.revenue - a.revenue);
  const metric = (label: string, value: string, detail: string) => <div className={s.metric}><p>{label}</p><strong>{value}</strong><span>{detail}</span></div>;
  const periodDates = period.start ? `${date(period.start)} — ${date(period.end)}` : `Hasta el ${date(period.end)}`;

  return (
    <div className={`${bodyFont.variable} ${headingFont.variable}`}>
      <Navbar />
      <div className="flex min-h-screen bg-white pt-16">
        <Sidebar />
        <main className={s.main}><div className={s.wrap}>
          <header className={s.header}>
            <div><p className={s.eyebrow}>TU ESPACIO DE VENDEDOR</p><h1>Tus productos. Tus resultados.</h1><p>Gestioná tus productos, seguí tus ventas y organizá tus cobros.</p></div>
            <Link href="/seller/products/new" className={s.primary}>Crear producto<ArrowRightIcon aria-hidden="true" /></Link>
          </header>
          <nav aria-label="Secciones del dashboard" className={s.mobileNav}><a href="#products">Productos</a><a href="#orders">Ventas</a><a href="#affiliates">Afiliados</a><a href="#payments">Cobros</a></nav>

          <section className={s.balances} aria-labelledby="balance-heading">
            <div className={s.available}>
              <div><h2 id="balance-heading">Disponible para cobrar</h2><p className={s.balanceAmount}>{money(available)} <span>UYU</span></p><p>Saldo neto habilitado para cobro, descontando comisiones y solicitudes en proceso.</p></div>
              <div className={s.payoutAction}>
                {legacyRequest ? <p className={s.small}>Hay una solicitud del sistema anterior que necesita revisión del administrador para liberar nuevos cobros.</p> : missing.length > 0 ? <><Link href="/perfil/config#datos-de-cobro" className={s.secondary}>Completá tus datos para cobrar<ArrowRightIcon aria-hidden="true" /></Link><p className={s.small}>Falta completar: {missing.join(", ")}.</p></> : <><PayoutRequestButton disabled={available <= 0} pending={false} idleLabel="Solicitar cobro" pendingLabel="Cobro solicitado" />{available <= 0 && <p className={s.small}>El botón se habilita cuando tengas saldo disponible.</p>}</>}
              </div>
            </div>
            <div className={s.otherBalances}>
              <div className={s.metric}><p>Cobros en proceso</p><strong>{money(requestedAmount)}</strong><span>{pendingRequests.length > 0 ? "Solicitado para transferir a tu cuenta." : "No tenés cobros en proceso."}</span>{pendingRequests.length > 0 && <a href="#payments" className={s.textLink}>Ver detalle de cobros<ArrowRightIcon aria-hidden="true" /></a>}</div>
              {metric("Ya cobrado", money(paidTotal._sum.netAmount ?? 0), "Ingresos liquidados de todo tu historial.")}
            </div>
            <p className={s.balanceScope}>Tus saldos y solicitudes de cobro no cambian con el filtro de tiempo. Todos los importes están en pesos uruguayos (UYU).</p>
          </section>

          <div className={s.periodBar}><DashboardPeriodPicker value={period.value} /><p id="period-scope">{periodDates}. El filtro se aplica a las ventas, ingresos, clics y rendimiento de productos. Tu catálogo sigue visible.</p></div>

          <section id="products" className={s.section} aria-labelledby="products-heading">
            <div className={s.sectionHeading}><div><h2 id="products-heading">Mis productos</h2><p>{products.filter(product => product.isActive).length} activos · {products.length} productos en tu catálogo</p></div><Link href="/seller/products" className={s.textLink}>Administrar productos<ArrowRightIcon aria-hidden="true" /></Link></div>
            <div className={s.panel}><DashboardActivity key={`products-${period.value}`} empty="Todavía no creaste productos. Publicá el primero para empezar a vender." items={productStats.map(product => ({ id: product.id, title: product.name, detail: `${product.sales} ventas · ${money(product.revenue)} facturados en el período`, amount: money(product.price), status: product.isActive ? "APPROVED" : "PENDING", label: product.isActive ? "Activo" : "Inactivo" }))} /></div>
          </section>

          <section id="reports" className={s.section} aria-labelledby="reports-heading">
            <div className={s.sectionHeading}><div><h2 id="reports-heading">Rendimiento</h2><p>{period.label} · Solo ventas pagadas, sin canceladas.</p></div></div>
            <div className={s.metrics}>
              {metric("Ventas pagadas", current.length.toLocaleString("es-UY"), period.days ? salesComparison(current.length, previous.length) : "Ventas confirmadas de todo el historial.")}
              {metric("Facturación", money(gross), "Importe bruto de tus ventas en el período.")}
              {metric("Ingreso neto", money(net), "Después de las comisiones de plataforma y afiliados.")}
            </div>
            <details className={s.advanced}><summary>Ver métricas adicionales</summary><div className={s.extraMetrics}>
              {metric("Comisión de plataforma", money(current.reduce((sum, row) => sum + row.platformFee, 0)), "Descontada de las ventas del período.")}
              {metric("Comisiones de afiliados", money(current.reduce((sum, row) => sum + row.affiliateFee, 0)), "Generadas por ventas a través de afiliados.")}
              {metric("Ticket promedio", money(current.length ? gross / current.length : 0), "Facturación dividida por ventas pagadas.")}
              {metric("Productos sin ventas", productStats.filter(product => !product.sales).length.toLocaleString("es-UY"), "Productos del catálogo sin ventas pagadas en el período.")}
            </div></details>
            <p className={s.periodNote}>Las ventas usan la fecha de creación de la compra y su estado actual de pago. Los ingresos del período no equivalen al saldo disponible para cobrar.</p>
          </section>

          <section id="affiliates" className={s.section} aria-labelledby="affiliates-heading">
            <div className={s.sectionHeading}><div><h2 id="affiliates-heading">Tus afiliados</h2><p>{period.label} · Actividad de quienes recomiendan tus productos.</p></div></div>
            <div className={s.metrics}>
              {metric("Afiliados con ventas", affiliatesWithSales.toLocaleString("es-UY"), "Afiliados que generaron ventas pagadas en el período.")}
              {metric("Clics en enlaces de productos", clicks.toLocaleString("es-UY"), "Visitas recibidas en el período. No incluye enlaces de campañas.")}
              {metric("Enlaces de productos", productLinks.length.toLocaleString("es-UY"), `${new Set(productLinks.map(link => link.affiliateId)).size} afiliados con enlaces. Total histórico.`)}
            </div>
          </section>

          <section id="orders" className={s.section} aria-labelledby="orders-heading">
            <div className={s.sectionHeading}><div><h2 id="orders-heading">Tus ventas</h2><p>{period.label} · Importes netos y estado de cobro.</p></div><Link href="/seller/orders" className={s.textLink}>Gestionar ventas<ArrowRightIcon aria-hidden="true" /></Link></div>
            <div className={s.panel}><DashboardActivity key={`orders-${period.value}`} empty="No hay ventas pagadas en este período. Podés ampliar el rango de fechas." items={current.map(row => ({ id: row.id, title: row.order.items.map(item => `${item.product.name}${item.quantity > 1 ? ` ×${item.quantity}` : ""}`).join(", ") || "Venta digital", detail: `${date(row.order.createdAt)} · ${row.order.buyerName || "Sin nombre"} · ${row.order.buyerPhone || row.order.buyerEmail || "Sin contacto"} · Bruto ${money(row.grossAmount)}`, amount: `${money(row.netAmount)} netos`, status: row.status === "AVAILABLE" && row.fulfillmentStatus === "DELIVERED" ? "APPROVED" : row.status, label: row.status === "PAID" ? "Cobrado" : reservedIds.has(row.id) ? "Cobro solicitado" : row.status === "AVAILABLE" && row.fulfillmentStatus === "DELIVERED" ? "Disponible" : "Acceso por completar" }))} /></div>
          </section>

          <section id="payments" className={s.section} aria-labelledby="payments-heading">
            <div className={s.sectionHeading}><div><h2 id="payments-heading">Historial de cobros</h2><p>Todas tus solicitudes, independientemente del período seleccionado.</p></div><Link href="/perfil/config" className={s.textLink}>Datos de cobro<ArrowRightIcon aria-hidden="true" /></Link></div>
            <div className={s.panel}><DashboardActivity empty="Todavía no solicitaste un cobro. Cuando tengas saldo disponible, podés solicitarlo desde el resumen de arriba." items={requests.map(request => ({ id: request.id, title: "Solicitud de cobro", detail: `Solicitado: ${date(request.requestedAt)}${request.paidAt ? ` · Pagado: ${date(request.paidAt)}` : ""}`, amount: `${money(request.amount)} UYU`, status: request.status, label: paymentLabels[request.status] ?? request.status }))} /></div>
          </section>
        </div></main>
      </div>
    </div>
  );
}
