const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const jsx = (type, props) => ({ type, props });
function load(file, mocks = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(source, { module, exports: module.exports, Date, Set, Map, Intl, process, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name in mocks) return typeof mocks[name] === "string" ? { default: mocks[name] } : mocks[name];
    throw new Error(`Unexpected dependency: ${name}`);
  } });
  return module.exports;
}
const helpers = load('lib/affiliate-dashboard.ts');
const now = new Date('2026-09-08T15:00:00Z');
for (const days of [7, 30, 90]) {
  const period = helpers.getDashboardPeriod(String(days), now);
  assert.equal(period.end - period.start, days * 86400000);
  assert.equal(period.start - period.previousStart, days * 86400000);
  assert.equal(helpers.inDashboardPeriod(period.start, period), true);
  assert.equal(helpers.inDashboardPeriod(period.start, period, true), false);
  assert.equal(helpers.inDashboardPeriod(new Date(period.start - 1), period), false);
  assert.equal(helpers.inDashboardPeriod(new Date(period.start - 1), period, true), true);
  assert.equal(helpers.inDashboardPeriod(period.previousStart, period, true), true);
  assert.equal(helpers.inDashboardPeriod(new Date(+period.previousStart - 1), period, true), false);
  assert.equal(helpers.inDashboardPeriod(now, period), true);
  assert.equal(helpers.inDashboardPeriod(new Date(+now + 1), period), false);
}
assert.equal(helpers.getDashboardPeriod('bad', now).value, '30');
assert.equal(helpers.getDashboardPeriod(['7', '90'], now).value, '30');
assert.equal(helpers.inDashboardPeriod('2000-01-01', helpers.getDashboardPeriod('all', now)), true);
assert.equal(helpers.inDashboardPeriod('invalid', helpers.getDashboardPeriod('all', now)), false);
assert.equal(helpers.salesComparison(3, 0), 'Sin ventas en el período anterior');
assert.equal(helpers.salesComparison(0, 0), 'Sin ventas en ambos períodos');
assert.match(helpers.salesComparison(4, 2), /^\+100%/);
assert.match(helpers.salesComparison(0, 2), /^-100%/);

const order = (id, createdAt, status = 'PAID') => ({ id, status, createdAt: new Date(createdAt) });
const recent = order('recent', '2026-09-07T15:00:00Z');
const older = order('older', '2026-08-29T15:00:00Z');
const unpaid = order('unpaid', '2026-09-07T15:00:00Z', 'PENDING');
const commissions = [
  { id: 'c1', status: 'APPROVED', amount: 100, order: recent },
  { id: 'c2', status: 'CANCELED', amount: 900, order: recent },
  { id: 'c3', status: 'PENDING', amount: 50, order: recent },
  { id: 'c4', status: 'PAID', amount: 200, order: older },
  { id: 'c5', status: 'PENDING', amount: 500, order: unpaid },
];
const sales = [{ order: recent }, { order: recent }, { order: older }, { order: unpaid }];
const metrics = helpers.summarizeAffiliatePeriod(sales, commissions, 10, helpers.getDashboardPeriod('7', now));
assert.equal(metrics.sales, 1); // Order items must never double-count a sale.
assert.equal(metrics.earnings, 150); // No canceled commission or unpaid order.
assert.equal(metrics.conversion, 10);
assert.equal(metrics.earningsPerClick, 15);
const zero = helpers.summarizeAffiliatePeriod([], [], 0, helpers.getDashboardPeriod('7', now));
assert.equal(zero.conversion, null);
assert.equal(zero.earningsPerClick, null);
const previous = helpers.summarizeAffiliatePeriod(sales, commissions, 1, helpers.getDashboardPeriod('7', now), true);
assert.equal(previous.sales, 1);
assert.equal(previous.earnings, 200);

function flatten(tree) {
  if (Array.isArray(tree)) return tree.flatMap(flatten);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...flatten(tree.props?.children)];
}
function text(tree) {
  if (Array.isArray(tree)) return tree.map(text).join(' ');
  if (tree == null || typeof tree === 'boolean') return '';
  if (typeof tree !== 'object') return String(tree);
  return text(tree.props?.children);
}

async function integration(period) {
  const calls = [];
  const read = (name, result) => async args => { calls.push({ name, args }); return result; };
  const prisma = {
    affiliateLink: { findMany: read('links', [{ id: 'link-new', code: 'new', product: { id: 'p', name: 'Course', isActive: true }, _count: { clicks: 2 } }, { id: 'link-old', code: 'old', product: { id: 'p2', name: 'Other', isActive: true }, _count: { clicks: 20 } }]) },
    commission: { findMany: read('commissions', commissions.map(c => ({ ...c, order: { ...c.order, product: { name: 'Course' } }, orderItem: null }))) },
    order: { findMany: read('orders', [recent, older, unpaid].map(o => ({ ...o, total: 1000, product: { name: 'Course' }, items: [] }))) },
    payoutRequest: { findMany: read('requests', []) },
    user: { findUnique: read('profile', { configured: true }) },
    click: { count: read('previous-clicks', 10) },
    campaignClick: { count: read('campaign-clicks', 3) },
  };
  const mocks = {
    'next/link': 'Link', 'next/navigation': { redirect: () => { throw new Error('Unexpected redirect'); } },
    'next-auth': { getServerSession: async () => ({ user: { id: 'affiliate-A' } }) },
    'next/font/google': { DM_Sans: () => ({ variable: 'body' }), Manrope: () => ({ variable: 'head' }) },
    '@heroicons/react/24/solid': { ArrowRightIcon: 'Arrow' },
    '@/components/Navbar': 'Navbar', '@/components/Sidebar': 'Sidebar', '@/components/PayoutRequestButton': 'PayoutButton',
    '@/components/affiliate/AffiliateLinks': 'AffiliateLinks', '@/components/affiliate/DashboardActivity': 'Activity', '@/components/affiliate/DashboardPeriodPicker': 'Picker',
    '@/components/affiliate/PromotionGuide': 'PromotionGuide',
    '@/lib/prisma': { prisma }, '@/app/api/auth/[...nextauth]/route': { authOptions: {} },
    '@/lib/payouts': { getAvailablePayoutAmount: async (id, kind) => { assert.equal(id, 'affiliate-A'); assert.equal(kind, 'AFFILIATE'); return 100; }, getMissingPayoutFields: () => [] },
    '@/lib/affiliate-dashboard': { ...helpers, getDashboardPeriod: value => helpers.getDashboardPeriod(value, now) },
    './dashboard.module.css': { default: new Proxy({}, { get: (_, key) => String(key) }) },
  };
  const page = load('app/dashboard/affiliate/page.tsx', mocks).default;
  const tree = await page({ searchParams: Promise.resolve({ period }) });
  const nodes = flatten(tree);
  assert.equal(nodes.find(n => n.type === 'PayoutButton').props.disabled, false);
  assert.equal(nodes.find(n => n.type === 'AffiliateLinks').props.links[0].id, 'link-new');
  assert.equal(nodes.find(n => n.type === 'AffiliateLinks').props.links.length, 2);
  assert.equal(nodes.find(n => n.type === 'AffiliateLinks').props.links[0].href, '/l/new');
  for (const name of ['links', 'commissions']) assert.equal(calls.find(c => c.name === name).args.where.affiliateId, 'affiliate-A');
  assert.equal(calls.find(c => c.name === 'requests').args.where.requesterId, 'affiliate-A');
  assert.equal(calls.find(c => c.name === 'profile').args.where.id, 'affiliate-A');
  assert.equal(calls.find(c => c.name === 'orders').args.where.OR[0].affiliateId, 'affiliate-A');
  assert.equal(calls.find(c => c.name === 'orders').args.where.OR[1].items.some.affiliateId, 'affiliate-A');
  const clickFilter = calls.find(c => c.name === 'links').args.select._count.select.clicks.where.createdAt;
  assert.equal(clickFilter.lte.toISOString(), now.toISOString());
  if (period === 'all') assert.equal(clickFilter.gte, undefined);
  else assert.equal(clickFilter.gte.toISOString(), helpers.getDashboardPeriod(period, now).start.toISOString());
  const balance = nodes.find(n => n.props?.className === 'balances');
  const activities = nodes.filter(n => n.type === 'Activity');
  return { balance: text(balance), commissions: activities[0].props.items.length };
}
(async () => {
  const week = await integration('7');
  const quarter = await integration('90');
  const all = await integration('all');
  assert.equal(week.balance, quarter.balance);
  assert.equal(week.balance, all.balance);
  assert.ok(week.commissions < quarter.commissions);
  console.log('PASS: 7/30/90/all, boundaries and previous periods, invalid ranges, no duplicate sales, excluded cancellations/unpaid orders, zero-click handling, account-scoped queries, recent links, referral URLs, period filtering and balances independent of dates. No real database or payout requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
