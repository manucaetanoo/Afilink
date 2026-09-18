import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { FiArrowRight, FiUsers, FiShoppingBag, FiCreditCard, FiCheckCircle } from "react-icons/fi";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const number = (value: number) => value.toLocaleString("es-UY");

export default async function AdminDashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard/affiliate");
  const [orders, payouts, products] = await Promise.all([
    prisma.order.count({ where: { status: "PAID" } }),
    prisma.payoutRequest.count({ where: { status: "PENDING" } }),
    prisma.product.count({ where: { isActive: true } }),
  ]);
  const sections = [
    { href: "/admin/orders", title: "Ventas", description: "Revisá compras, estados de pago y cancelaciones.", icon: FiShoppingBag },
    { href: "/admin/deliveries", title: "Liquidaciones digitales", description: "Consultá las ventas digitales y sus liquidaciones.", icon: FiCheckCircle },
    { href: "/admin/payouts", title: "Pagos", description: "Gestioná las solicitudes de cobro de vendedores y afiliados.", icon: FiCreditCard },
  ];
  return <>
    <Navbar />
    <div className="flex min-h-screen bg-slate-50 pt-16">
      <Sidebar />
      <main className="mx-auto w-full min-w-0 max-w-6xl px-4 py-8 sm:p-10">
        <header className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-orange-700">Administración</p>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Tu plataforma, de un vistazo.</h1>
          <p className="mt-3 text-slate-600">Consultá la actividad y encontrá lo que necesitás gestionar.</p>
        </header>
        <section aria-labelledby="summary-heading">
          <h2 id="summary-heading" className="text-lg font-semibold text-slate-900">Resumen general</h2>
          <p className="mt-1 text-sm text-slate-500">Datos de toda la plataforma. Las ventas incluyen todo el historial.</p>
          <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { label: "Ventas pagadas", value: orders, detail: "Compras confirmadas · histórico", href: "/admin/orders" },
              { label: "Solicitudes de cobro pendientes", value: payouts, detail: "Pendientes de gestión", href: "/admin/payouts" },
              { label: "Productos activos", value: products, detail: "Catálogo actual", href: "/seller/products" },
            ].map(metric => <div key={metric.label} className="rounded-2xl border border-slate-200 bg-white p-6">
              <dt className="text-sm font-medium text-slate-600">{metric.label}</dt>
              <dd className="mt-3 text-4xl font-bold tabular-nums text-slate-900">{number(metric.value)}</dd>
              <dd><p className="mt-2 text-xs text-slate-500">{metric.detail}</p>
              <Link href={metric.href} className="mt-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-orange-700">Ver detalle<FiArrowRight aria-hidden="true" /><span className="sr-only"> de {metric.label}</span></Link></dd>
            </div>)}
          </dl>
        </section>
        <section aria-labelledby="activity-heading" className="mt-8 rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-6">
            <div className="max-w-xl"><FiUsers className="mb-4 h-7 w-7 text-orange-400" aria-hidden="true" />
              <h2 id="activity-heading" className="text-2xl font-semibold">Actividad de afiliados</h2>
              <p className="mt-3 leading-relaxed text-slate-300">Mirá cuántos clics recibís y de qué afiliados provienen. Consultá el ranking, los enlaces con actividad y el último clic por vendedor y período.</p>
            </div>
            <Link href="/admin/affiliates" className="inline-flex min-h-12 items-center justify-center gap-3 rounded-xl bg-orange-500 px-5 py-3 font-semibold text-slate-950 transition hover:bg-orange-400">Ver actividad de afiliados<FiArrowRight aria-hidden="true" /></Link>
          </div>
        </section>
        <section aria-labelledby="management-heading" className="mt-8">
          <h2 id="management-heading" className="text-lg font-semibold text-slate-900">Gestión de la plataforma</h2>
          {payouts > 0 && <p className="mt-2 text-sm text-slate-600">Tenés {number(payouts)} solicitudes de cobro pendientes. Podés revisarlas en Pagos.</p>}
          <div className="mt-4 grid gap-4 md:grid-cols-3">{sections.map(item => <Link key={item.href} href={item.href} className="group rounded-2xl border border-slate-200 bg-white p-6 transition hover:border-orange-400 hover:shadow-sm">
            <item.icon className="h-6 w-6 text-orange-700" aria-hidden="true" />
            <h3 className="mt-5 flex items-center justify-between gap-3 text-lg font-semibold text-slate-900">{item.title}<FiArrowRight aria-hidden="true" className="shrink-0 text-slate-400 group-hover:text-orange-700" /></h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
          </Link>)}</div>
        </section>
      </main>
    </div>
  </>;
}
