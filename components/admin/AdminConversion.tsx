import { prisma } from "@/lib/prisma";
import { dashboardPeriods, getDashboardPeriod } from "@/lib/affiliate-dashboard";
import { conversionPercent, funnelStages, getConversionMetrics } from "@/lib/conversion-metrics";

export default async function AdminConversion({ params }: { params: { period?: string; productId?: string; device?: string } }) {
  const period = getDashboardPeriod(params.period);
  const device = ["mobile", "tablet", "desktop"].includes(params.device ?? "") ? params.device! : "all";
  const products = await prisma.product.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } });
  const productId = products.some(p => p.id === params.productId) ? params.productId : undefined;
  const metrics = await getConversionMetrics(period, productId, device);
  const visits = metrics.stages.product_view ?? 0;
  const stateLabels = { not_started: "Pago sin iniciar", abandoned: "Abandono estimado", verifying: "Resultado en verificación", pending: "Pendiente en Mercado Pago", rejected: "Rechazado o intento fallido", approved: "Aprobada", canceled: "Cancelada o devuelta", legacy: "Histórica sin detalle del intento" };
  return <section id="conversion" className="mt-8 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6" aria-labelledby="conversion-heading">
    <h2 id="conversion-heading" className="text-xl font-semibold text-slate-900">Conversión de compras</h2>
    <form action="/admin#conversion" className="my-5 flex flex-wrap items-end gap-3">
      <label className="text-sm">Período<select name="period" defaultValue={period.value} className="mt-2 block min-h-11 rounded-lg border p-2">{dashboardPeriods.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}</select></label>
      <label className="min-w-0 text-sm">Producto<select name="productId" defaultValue={productId ?? ""} className="mt-2 block min-h-11 max-w-full rounded-lg border p-2"><option value="">Todos los productos</option>{products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label>
      <label className="text-sm">Dispositivo<select name="device" defaultValue={device} className="mt-2 block min-h-11 rounded-lg border p-2"><option value="all">Todos</option><option value="mobile">Celular</option><option value="tablet">Tablet</option><option value="desktop">Computadora</option></select></label>
      <button className="min-h-11 rounded-lg bg-slate-900 px-4 font-semibold text-white">Aplicar</button>
    </form>
    <p className="text-sm leading-6 text-slate-600">Sesiones que visitaron una ficha en el período y registraron cada etapa después de esa visita. Una sesión se cuenta una vez por etapa; una misma persona puede tener varias sesiones. La conversión usa compras verificadas en Mercado Pago.</p>
    <div className="mt-4 overflow-x-auto"><table className="w-full text-left text-sm"><caption className="sr-only">Embudo de compra por sesiones</caption><thead className="bg-slate-50"><tr><th className="p-3">Etapa</th><th className="p-3 text-right">Sesiones</th><th className="p-3 text-right">Sobre visitas</th></tr></thead><tbody>{funnelStages.map(([key, label]) => <tr key={key} className="border-t"><th scope="row" className="p-3 font-medium">{label}</th><td className="p-3 text-right">{metrics.stages[key] ?? 0}</td><td className="p-3 text-right">{conversionPercent(metrics.stages[key] ?? 0, visits)}</td></tr>)}</tbody></table></div>
    <h3 className="mt-6 font-semibold">Estado actual de las órdenes creadas en el período</h3>
    <dl className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{Object.entries(stateLabels).map(([key,label]) => <div key={key} className="rounded-xl bg-slate-50 p-4"><dt className="text-sm text-slate-600">{label}</dt><dd className="mt-2 text-2xl font-semibold">{metrics.states[key] ?? 0}</dd></div>)}</dl>
    <p className="mt-3 text-xs leading-5 text-slate-500">El abandono es una estimación: orden sin pago enviado y sin actividad durante 24 horas. No cancela la orden ni sus comisiones. Un pago con resultado incierto siempre queda en verificación.</p>
    <h3 className="mt-6 font-semibold">Clics de afiliados</h3>
    <p className="mt-2 text-sm leading-6 text-slate-600">{metrics.clicks} clics · {metrics.clickSessions} sesiones identificadas · {Math.max(0, metrics.clicks - metrics.historicalClicks - metrics.clickSessions)} clics adicionales de esas sesiones · {metrics.historicalClicks} clics históricos sin sesión.</p>
    <p className="mt-2 text-xs leading-5 text-slate-500">Los clics conservan su conteo original, incluyendo repeticiones. Incluyen campañas y no usan el filtro de dispositivo. El embudo comienza a medirse desde esta versión; los registros antiguos no permiten reconstruir sesiones.</p>
  </section>;
}
