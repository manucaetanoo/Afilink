import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type { DashboardPeriod } from "@/lib/affiliate-dashboard";

export const funnelStages = [
  ["product_view", "Visita al producto"], ["buy_click", "Comprar ahora"],
  ["checkout_started", "Llegada al checkout"], ["details_submitted", "Datos confirmados"],
  ["payment_ready", "Formulario de pago listo"], ["payment_submitted", "Pago enviado"],
  ["purchase_approved", "Compra aprobada"],
] as const;
export function conversionPercent(numerator: number, denominator: number) {
  return denominator ? `${(numerator / denominator * 100).toFixed(1)}%` : "—";
}
export async function getConversionMetrics(period: DashboardPeriod, productId?: string, device?: string) {
  const dates = Prisma.sql`e."createdAt" <= ${period.end} ${period.start ? Prisma.sql`AND e."createdAt" >= ${period.start}` : Prisma.empty}`;
  const product = productId ? Prisma.sql`AND e."productId" = ${productId}` : Prisma.empty;
  const deviceFilter = device && device !== "all" ? Prisma.sql`AND e."device" = ${device}` : Prisma.empty;
  const stages = await prisma.$queryRaw<{ name: string; sessions: bigint }[]>(Prisma.sql`
    WITH cohort AS (
      SELECT "sessionId", "productId", MIN("createdAt") AS arrived FROM "PurchaseEvent" e
      WHERE e.name = 'product_view' AND ${dates} ${product} ${deviceFilter}
      GROUP BY "sessionId", "productId"
    )
    SELECT e.name, COUNT(DISTINCT e."sessionId") AS sessions FROM "PurchaseEvent" e
    JOIN cohort c ON c."sessionId" = e."sessionId" AND c."productId" = e."productId"
    WHERE e."createdAt" >= c.arrived AND e."createdAt" <= ${period.end}
    GROUP BY e.name`);
  const orderProduct = productId ? Prisma.sql`AND o."productId" = ${productId}` : Prisma.empty;
  const orderDevice = device && device !== "all" ? Prisma.sql`AND EXISTS (SELECT 1 FROM "PurchaseEvent" v WHERE v."sessionId" = o."sessionId" AND v.name = 'product_view' AND v.device = ${device})` : Prisma.empty;
  const states = await prisma.$queryRaw<{ state: string; count: bigint }[]>(Prisma.sql`
    SELECT CASE
      WHEN o.status = 'PAID' AND o."paidAt" IS NOT NULL AND o."paymentProvider" = 'mercadopago' THEN 'approved'
      WHEN o.status = 'PAID' THEN 'legacy'
      WHEN o.status = 'CANCELED' THEN 'canceled'
      WHEN o."paymentStatus" IN ('pending','in_process','authorized') AND o."paymentId" IS NOT NULL THEN 'pending'
      WHEN o."paymentStatus" IN ('processing','unknown','pending_wallet') OR EXISTS (SELECT 1 FROM "PaymentAttempt" a WHERE a."orderId" = o.id AND a.status IN ('processing','unknown','pending_wallet')) THEN 'verifying'
      WHEN o."paymentStatus" IN ('rejected','cancelled','failed') THEN 'rejected'
      WHEN o."sessionId" IS NULL THEN 'legacy'
      WHEN o."updatedAt" < ${new Date(period.end.getTime() - 24 * 60 * 60 * 1000)} THEN 'abandoned'
      ELSE 'not_started' END AS state, COUNT(*) AS count
    FROM "Order" o WHERE o."createdAt" <= ${period.end}
      ${period.start ? Prisma.sql`AND o."createdAt" >= ${period.start}` : Prisma.empty} ${orderProduct} ${orderDevice}
    GROUP BY state`);
  const clicks = await prisma.$queryRaw<{ total: bigint; sessions: bigint; unknown: bigint }[]>(Prisma.sql`
    SELECT COUNT(*) AS total, COUNT(DISTINCT c."sessionId") AS sessions, COUNT(*) FILTER (WHERE c."sessionId" IS NULL) AS unknown
    FROM (
      SELECT k."sessionId", k."createdAt" FROM "Click" k JOIN "AffiliateLink" l ON l.id = k."linkId"
      WHERE k."createdAt" <= ${period.end} ${period.start ? Prisma.sql`AND k."createdAt" >= ${period.start}` : Prisma.empty}
      ${productId ? Prisma.sql`AND l."productId" = ${productId}` : Prisma.empty}
      UNION ALL
      SELECT k."sessionId", k."createdAt" FROM "CampaignClick" k JOIN "AffiliateCampaignLink" l ON l.id = k."linkId"
      WHERE k."createdAt" <= ${period.end} ${period.start ? Prisma.sql`AND k."createdAt" >= ${period.start}` : Prisma.empty}
      ${productId ? Prisma.sql`AND EXISTS (SELECT 1 FROM "CampaignProduct" cp WHERE cp."campaignId" = l."campaignId" AND cp."productId" = ${productId})` : Prisma.empty}
    ) c`);
  const stageCounts = Object.fromEntries(stages.map(row => [row.name, Number(row.sessions)]));
  const clickSummary = clicks[0];
  return { stages: stageCounts, states: Object.fromEntries(states.map(row => [row.state, Number(row.count)])),
    clicks: Number(clickSummary?.total ?? 0), clickSessions: Number(clickSummary?.sessions ?? 0), historicalClicks: Number(clickSummary?.unknown ?? 0) };
}
