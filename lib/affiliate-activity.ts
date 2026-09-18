type ActivityLink = {
  affiliateId: string;
  affiliate: { name: string | null };
  _count: { clicks: number };
  clicks: { createdAt: Date }[];
};

// Each input row is one product link; counts and latest clicks share the period filter.
export function summarizeAffiliateActivity(links: ActivityLink[]) {
  const affiliates = new Map<string, {
    id: string; name: string; clicks: number; linksWithClicks: number; lastClick: Date;
  }>();
  for (const link of links) {
    const latest = link.clicks[0]?.createdAt;
    if (link._count.clicks === 0 || !latest) continue;
    const row = affiliates.get(link.affiliateId) ?? {
      id: link.affiliateId, name: link.affiliate.name?.trim() || "Sin nombre",
      clicks: 0, linksWithClicks: 0, lastClick: latest,
    };
    row.clicks += link._count.clicks;
    row.linksWithClicks += 1;
    if (latest > row.lastClick) row.lastClick = latest;
    affiliates.set(row.id, row);
  }
  const rows = [...affiliates.values()].sort((a, b) => b.clicks - a.clicks || a.name.localeCompare(b.name, "es") || a.id.localeCompare(b.id));
  return { rows, affiliatesWithClicks: rows.length, clicks: rows.reduce((sum, row) => sum + row.clicks, 0) };
}
