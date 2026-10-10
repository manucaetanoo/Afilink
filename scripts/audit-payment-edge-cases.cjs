// Regression tests with fake storage. No database, provider calls or real transfers.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, Buffer, process: { env: {} }, console, require: name => {
    if (name === 'crypto') return require('node:crypto');
    if (name in mocks) return mocks[name];
    throw new Error('Unexpected import ' + name);
  } });
  return module.exports;
}
const enums = load('lib/prisma-enums.ts');
(async () => {
  let order = { id: 'order', total: 9900, status: 'PENDING', paymentStatus: 'pending', items: [] };
  let notifications = 0, commissionsApproved = 0, canceled = 0;
  const tx = {
    order: { findUnique: async () => order, update: async ({data}) => Object.assign(order,data) },
    commission: { updateMany: async ({data}) => { if (data.status === 'APPROVED') commissionsApproved++; else canceled++; } },
    settlement: { updateMany: async () => {} },
    notification: { createMany: async () => notifications++ },
    paymentAttempt: { findFirst: async () => null, updateMany: async () => ({ count: 0 }) },
  };
  const financial = { financialTransaction: async work => work(tx) };
  const events = load('lib/order-events.ts', { '@/lib/prisma-enums': enums, '@/lib/financial-transaction': financial,
    '@/lib/email': { sendTransactionalEmail: async () => { throw new Error('Unexpected email'); } }, '@/lib/product-access': {}, '@/lib/purchase-analytics': { recordPurchaseEvent: async () => {} } });
  const mp = load('lib/payments/mercadopago.ts', { '@/lib/prisma-enums': enums, '@/lib/prisma': { prisma: tx }, '@/lib/order-events': events, '@/lib/financial-transaction': financial, '@/lib/payments/attempts': {}, '@/lib/purchase-analytics': { recordPurchaseEvent: async () => {} } });
  const payment = { id: 'payment', external_reference: 'order', status: 'approved', transaction_amount: 9900, currency_id: 'UYU' };
  for (const invalid of [{ transaction_amount: 1 }, { currency_id: 'USD' }, { transaction_amount: undefined }, { currency_id: undefined }]) {
    await assert.rejects(mp.syncOrderWithMercadoPagoPayment({ ...payment, ...invalid }), /importe o la moneda/);
    assert.equal(order.status,'PENDING');
  }
  await mp.syncOrderWithMercadoPagoPayment(payment);
  await mp.syncOrderWithMercadoPagoPayment(payment);
  assert.equal(order.status,'PAID'); assert.equal(commissionsApproved,1); assert.equal(notifications,0);
  for (const status of ['pending','rejected','cancelled']) await mp.syncOrderWithMercadoPagoPayment({ ...payment, id: 'old-attempt', status });
  await mp.syncOrderWithMercadoPagoPayment({ ...payment, id: 'other-payment', status: 'refunded' });
  assert.equal(order.status,'PAID'); assert.equal(canceled,0);
  await mp.syncOrderWithMercadoPagoPayment({ ...payment, status: 'refunded' });
  assert.equal(order.status,'CANCELED'); assert.equal(canceled,1);
  await assert.rejects(mp.syncOrderWithMercadoPagoPayment(payment), /revertido/);
  console.log('PASS: amount/currency, paid approval, duplicate notification, late attempt, matching refund and no reapproval after refund.');

  let createdClicks = 0;
  let cookie = 'old-click'; let ref = 'new-ref';
  const checkout = load('app/api/checkout/route.ts', {
    'next/server': { NextResponse: { json: body => body } },
    'next/headers': { cookies: async () => ({ get: key => ({ value: key === 'aff_click_id' ? cookie : 'old-campaign' }), set: () => {}, delete: () => {} }) },
    '@/lib/purchase-analytics': { getPurchaseSession: async () => 'test-session' },
    '@/lib/prisma': { prisma: {
      affiliateLink: { findUnique: async ({where}) => where.code === 'new-ref' ? { id: 'new-link', productId: 'product-B' } : null },
      click: { findUnique: async () => ({ linkId: cookie === 'matching-click' ? 'new-link' : 'old-link', link: { productId: 'product-A' } }), create: async () => { createdClicks++; return { id: 'new-click' }; } },
    } },
  });
  async function draft() {
    const result = await checkout.POST({ json: async () => ({ productId: 'product-B', refCode: ref }), headers: { get: () => null } });
    return JSON.parse(Buffer.from(new URL(result.checkout.url, 'https://example.invalid').searchParams.get('items'),'base64url').toString())[0];
  }
  let item = await draft(); assert.equal(item.clickId,'new-click'); assert.equal(item.campaignClickId,undefined);
  cookie='matching-click'; item=await draft(); assert.equal(item.clickId,'matching-click'); assert.equal(createdClicks,1);
  cookie='old-click'; ref=undefined; item=await draft(); assert.equal(item.clickId,undefined); assert.equal(item.campaignClickId,'old-campaign');
  console.log('PASS: explicit referral beats stale cookie/campaign, matching click is reused, wrong-product cookie is excluded.');

  let rows = [{ id: 'original', amount: 100, status: 'APPROVED', order: { status: 'PAID' } }];
  let requests = [];
  const store = {
    payoutRequest: {
      findMany: async () => requests.filter(r => r.status === 'PENDING'),
      findUnique: async ({where}) => requests.find(r => r.id === where.id),
      update: async ({where,data}) => Object.assign(requests.find(r => r.id === where.id),data),
    },
    commission: {
      findMany: async ({where}) => {
        assert.equal(where.affiliateId,'affiliate'); assert.equal(where.order.status,'PAID');
        return rows.filter(r => r.status === where.status && r.order.status === where.order.status &&
          (!where.id.in || where.id.in.includes(r.id)) && (!where.id.notIn || !where.id.notIn.includes(r.id)));
      },
      updateMany: async ({where,data}) => { let count=0; for (const row of rows) if (where.id.in.includes(row.id) && row.status === where.status) { Object.assign(row,data);count++; } return { count }; },
    },
  };
  const payouts = load('lib/payouts.ts', { '@/lib/prisma-enums': enums, '@/lib/prisma': { prisma: store } });
  const { completePayout } = load('lib/complete-payout.ts');
  let snapshot = await payouts.getPayoutSnapshot(store,'affiliate','AFFILIATE');
  assert.equal(snapshot.amount,100);
  requests.push({ id:'r1', requesterId:'affiliate', kind:'AFFILIATE', status:'PENDING', ...snapshot });
  assert.equal(await payouts.getAvailablePayoutAmount('affiliate','AFFILIATE'),0);
  rows.push({ id:'new', amount:200, status:'APPROVED', order:{ status:'PAID' } });
  assert.equal(await payouts.getAvailablePayoutAmount('affiliate','AFFILIATE'),200);
  await completePayout(store,'r1',null);
  assert.equal(rows[0].status,'PAID');assert.equal(rows[1].status,'APPROVED');
  await assert.rejects(completePayout(store,'r1',null), /procesada/);
  snapshot=await payouts.getPayoutSnapshot(store,'affiliate','AFFILIATE');
  requests.push({ id:'r2', requesterId:'affiliate', kind:'AFFILIATE', status:'PENDING', ...snapshot });
  rows[1].status='CANCELED';
  await assert.rejects(completePayout(store,'r2',null), /saldo/);
  assert.equal(requests[1].status,'PENDING');
  await completePayout(store,'r2',null,true);
  assert.equal(requests[1].status,'CANCELED');
  requests.push({ id:'legacy', requesterId:'affiliate', kind:'AFFILIATE', status:'PENDING', amount:200, commissionIds:[],settlementIds:[] });
  await assert.rejects(completePayout(store,'legacy',null), /antigua/);
  assert.equal(await payouts.getAvailablePayoutAmount('affiliate','AFFILIATE'),0);
  await completePayout(store,'legacy',null,true);
  console.log('PASS: exact payout allocation, later earnings available, no double payment, refund conflict, cancellation and legacy requests held for reconciliation.');

  const adminCancel = load('app/api/admin/orders/[id]/cancel/route.ts', {
    'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } },
    '@/lib/auth': { requireUser: async () => ({ role:'ADMIN' }), requireRole: () => {} },
    '@/lib/prisma-enums': enums,
    '@/lib/financial-transaction': { financialTransaction: async work => work({ order: { findUnique: async () => ({ id:'order', status:'PAID', settlements:[], commissions:[{ status:'PAID' }] }) } }) },
  });
  const cancelResult = await adminCancel.PATCH({ json: async () => ({}) },{ params:Promise.resolve({ id:'order' }) });
  assert.equal(cancelResult.status,400);assert.equal(cancelResult.body.ok,false);
  console.log('PASS: admin cancellation cannot erase an already paid affiliate commission.');

  let attempts=0;
  const retry=load('lib/financial-transaction.ts',{ '@/lib/prisma': { prisma:{ $transaction: async (work, options) => {
    assert.equal(options.isolationLevel,'Serializable');
    if (++attempts < 3) throw { code:'P2034' };
    return work({});
  } } } });
  assert.equal(await retry.financialTransaction(async () => 'ok'),'ok');assert.equal(attempts,3);
  console.log('PASS: serializable database conflicts retry without provider calls.');
})().catch(error => { console.error(error); process.exitCode=1; });
