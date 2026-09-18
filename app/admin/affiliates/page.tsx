import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { dashboardPeriods, getDashboardPeriod, getDashboardClickDates, getSellerProductLinkScope } from "@/lib/affiliate-dashboard";
import { summarizeAffiliateActivity } from "@/lib/affiliate-activity";

export const dynamic = "force-dynamic";
const number = (value: number) => value.toLocaleString("es-UY");
const date = (value: Date) => new Intl.DateTimeFormat("es-UY", {
  dateStyle: "medium", timeStyle: "short", timeZone: "America/Montevideo",
}).format(value);

export default async function AdminAffiliateActivityPage({ searchParams }: {
  searchParams: Promise<{ period?: string | string[]; sellerId?: string | string[] }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard/affiliate");

  const params = await searchParams;
  const period = getDashboardPeriod(params.period);
  const sellers = await prisma.user.findMany({
    where: { products: { some: {} } },
    select: { id: true, name: true, email: true },
    orderBy: [{ name: "asc" }, { id: "asc" }],
  });
  const seller = sellers.find(row => row.id === params.sellerId);
  const createdAt = getDashboardClickDates(period);
  const links = seller ? await prisma.affiliateLink.findMany({
    where: getSellerProductLinkScope(seller.id),
    select: {
      affiliateId: true, affiliate: { select: { name: true } },
      _count: { select: { clicks: { where: { createdAt } } } },
      clicks: { where: { createdAt }, orderBy: { createdAt: "desc" }, take: 1, select: { createdAt: true } },
    },
  }) : [];
  const activity = summarizeAffiliateActivity(links);

  return <>
    <Navbar />
    <div className="flex min-h-screen bg-slate-50 pt-16">
      <Sidebar />
      <main className="mx-auto w-full min-w-0 max-w-6xl p-4 sm:p-8">
        <header className="mb-8"><p className="text-sm text-slate-500">Administración</p><h1 className="text-3xl font-bold text-slate-900">Actividad de afiliados</h1></header>
        <form action="/admin/affiliates" className="mb-6 flex flex-wrap items-end gap-4">
          <div className="min-w-0"><label htmlFor="seller" className="mb-2 block text-sm font-medium">Vendedor</label>
            <select id="seller" name="sellerId" defaultValue={seller?.id ?? ""} required className="min-h-11 max-w-full rounded-lg border border-slate-300 bg-white p-2">
              <option value="" disabled>Seleccioná un vendedor</option>
              {sellers.map(row => <option key={row.id} value={row.id}>{row.name || "Sin nombre"} · {row.email}</option>)}
            </select>
          </div>
          <div><label htmlFor="period" className="mb-2 block text-sm font-medium">Período</label>
            <select id="period" name="period" defaultValue={period.value} className="min-h-11 rounded-lg border border-slate-300 bg-white p-2">
              {dashboardPeriods.map(row => <option key={row.value} value={row.value}>{row.label}</option>)}
            </select>
          </div>
          <button className="min-h-11 rounded-lg bg-slate-900 px-5 py-2 font-semibold text-white">Aplicar filtros</button>
        </form>
        {!seller ? <p role="status" className="rounded-xl border border-slate-200 bg-white p-6">Seleccioná un vendedor para consultar sus afiliados con el mismo alcance que su panel.</p> : <section aria-labelledby="affiliates-heading">
          <h2 id="affiliates-heading" className="text-xl font-semibold">Tus afiliados</h2>
          <p className="mt-2 text-sm text-slate-600">{seller.name || seller.email} · {period.label}. {period.start ? `${date(period.start)} — ` : "Hasta "}{date(period.end)} (Uruguay).</p>
          <p className="mt-2 text-sm text-slate-600">Solo enlaces de productos de este vendedor, incluidos los inactivos. No incluye campañas. Cada cuenta de afiliado se cuenta una sola vez.</p>
          <dl className="my-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-6"><dt>Clics en enlaces de productos</dt><dd className="mt-2 text-3xl font-bold">{number(activity.clicks)}</dd></div>
            <div className="rounded-xl border border-slate-200 bg-white p-6"><dt>Afiliados con clics</dt><dd className="mt-2 text-3xl font-bold">{number(activity.affiliatesWithClicks)}</dd></div>
          </dl>
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-left text-sm">
              <caption className="p-4 text-left text-slate-600">Afiliados ordenados de mayor a menor cantidad de clics en el período.</caption>
              <thead className="bg-slate-100"><tr><th scope="col" className="p-4">Afiliado</th><th scope="col" className="p-4 text-right">Clics recibidos</th><th scope="col" className="p-4 text-right">Enlaces con clics</th><th scope="col" className="p-4">Último clic (Uruguay)</th></tr></thead>
              <tbody>{activity.rows.map(row => <tr key={row.id} className="border-t border-slate-200"><th scope="row" className="p-4 font-medium">{row.name}</th><td className="p-4 text-right tabular-nums">{number(row.clicks)}</td><td className="p-4 text-right tabular-nums">{number(row.linksWithClicks)}</td><td className="whitespace-nowrap p-4"><time dateTime={row.lastClick.toISOString()}>{date(row.lastClick)}</time></td></tr>)}
                {activity.rows.length === 0 && <tr><td colSpan={4} className="p-6 text-center text-slate-500">No hay clics registrados en este período.</td></tr>}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-sm text-slate-600">Son clics registrados, no visitantes únicos: incluyen clics propios y repetidos. Los enlaces de productos excluyen algunos bots conocidos; el registro alternativo del checkout no aplica ese filtro. No se filtran nuevamente los registros históricos.</p>
        </section>}
      </main>
    </div>
  </>;
}
