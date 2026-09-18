export const dashboardPeriods = [
  { value: "7", label: "Últimos 7 días" },
  { value: "30", label: "Últimos 30 días" },
  { value: "90", label: "Últimos 90 días" },
  { value: "all", label: "Todo el historial" },
] as const;

export function getDashboardPeriod(value: unknown, now = new Date()) {
  const selected = dashboardPeriods.find((period) => period.value === value) ?? dashboardPeriods[1];
  const days = selected.value === "all" ? null : Number(selected.value);
  const duration = days === null ? null : days * 24 * 60 * 60 * 1000;
  return {
    ...selected,
    days,
    end: now,
    start: duration === null ? null : new Date(now.getTime() - duration),
    previousStart: duration === null ? null : new Date(now.getTime() - duration * 2),
  };
}

export type DashboardPeriod = ReturnType<typeof getDashboardPeriod>;

export function getDashboardClickDates(period: DashboardPeriod) {
  return { ...(period.start ? { gte: period.start } : {}), lte: period.end };
}

export function getSellerProductLinkScope(sellerId: string) {
  return { product: { sellerId } };
}

export function inDashboardPeriod(date: Date | string, period: DashboardPeriod, previous = false) {
  const time = new Date(date).getTime();
  if (previous) {
    return period.start !== null && period.previousStart !== null &&
      time >= period.previousStart.getTime() && time < period.start.getTime();
  }
  return time <= period.end.getTime() && (period.start === null || time >= period.start.getTime());
}

type Sale = { order: { id: string; status: string; createdAt: Date | string } };
type Commission = Sale & { amount: number; status: string };

export function summarizeAffiliatePeriod(
  sales: Sale[],
  commissions: Commission[],
  clicks: number,
  period: DashboardPeriod,
  previous = false,
) {
  const confirmed = sales.filter((sale) => sale.order.status === "PAID" && inDashboardPeriod(sale.order.createdAt, period, previous));
  const count = new Set(confirmed.map((sale) => sale.order.id)).size;
  const earnings = commissions
    .filter((commission) => commission.order.status === "PAID" && commission.status !== "CANCELED" && inDashboardPeriod(commission.order.createdAt, period, previous))
    .reduce((sum, commission) => sum + commission.amount, 0);
  return { sales: count, earnings, clicks, conversion: clicks > 0 ? count / clicks * 100 : null, earningsPerClick: clicks > 0 ? earnings / clicks : null };
}

export function salesComparison(current: number, previous: number) {
  if (previous === 0) return current === 0 ? "Sin ventas en ambos períodos" : "Sin ventas en el período anterior";
  const change = (current - previous) / previous * 100;
  return `${change >= 0 ? "+" : ""}${Math.round(change)}% respecto al período anterior`;
}
