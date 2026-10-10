// In-memory database and provider fixtures. Never uses DATABASE_URL or real payments.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file, mocks, globals = {}) {
  const sandboxModule = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText,
    { module: sandboxModule, exports: sandboxModule.exports, console, Buffer, AbortSignal, Date, process: { env: { APP_URL: 'https://example.invalid', MERCADOPAGO_ACCESS_TOKEN: 'fixture', ...globals.env } }, ...globals,
      require: name => name === 'crypto' ? crypto : name in mocks ? mocks[name] : (() => { throw Error(`Unexpected import ${name}`); })() });
  return sandboxModule.exports;
}
const clone = value => structuredClone(value);
function matches(row, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (key === 'OR') return value.some(w => matches(row, w));
    if (value && typeof value === 'object') return (!('not' in value) || row[key] !== value.not) && (!value.in || value.in.includes(row[key])) && (!value.notIn || !value.notIn.includes(row[key]));
    return row[key] === value;
  });
}
function fixture() {
  let order = { id: 'order', productId: 'product', sessionId: crypto.randomUUID(), total: 9900, status: 'PENDING', paymentStatus: 'ready', buyerEmail: null, product: { name: 'Curso' }, items: [] };
  let attempts = [], events = [], approved = 0, canceled = 0, sequence = 0;
  const store = {
    order: {
      findUnique: async () => clone(order), findUniqueOrThrow: async () => clone(order),
      update: async ({ data }) => { Object.assign(order, data); return clone(order); },
      updateMany: async ({ where, data }) => { if (!matches(order, where)) return { count: 0 }; Object.assign(order, data); return { count: 1 }; },
    },
    paymentAttempt: {
      findUnique: async ({ where }) => clone(attempts.find(a => matches(a, where)) ?? null),
      findFirst: async ({ where }) => clone(attempts.filter(a => matches(a, where)).sort((a,b) => b.createdAt - a.createdAt)[0] ?? null),
      create: async ({ data }) => { const row = { ...data, status: 'ready', paymentId: null, requestHash: null, createdAt: new Date(++sequence), startedAt: null }; attempts.push(row); return clone(row); },
      update: async ({ where, data }) => { const row = attempts.find(a => matches(a, where)); Object.assign(row, data); return clone(row); },
      updateMany: async ({ where, data }) => { const rows = attempts.filter(a => matches(a, where)); rows.forEach(row => Object.assign(row,data)); return { count: rows.length }; },
    },
    purchaseEvent: { createMany: async ({ data }) => { for (const event of data) if (!events.some(e => e.eventKey === event.eventKey)) events.push(event); } },
    commission: { updateMany: async ({ data }) => { if (data.status === 'APPROVED') approved++; if(data.status === 'CANCELED') canceled++; } },
    settlement: { updateMany: async () => {} }, notification: { createMany: async () => {} },
  };
  let queue = Promise.resolve();
  const financial = { financialTransaction: work => {
    const result = queue.then(() => work(store)); queue = result.catch(() => {}); return result;
  } };
  const analytics = { recordPurchaseEvent: (event, db = store) => db.purchaseEvent.createMany({ data: [event], skipDuplicates: true }) };
  const enums = load('lib/prisma-enums.ts', {});
  const attemptHelpers = load('lib/payments/attempts.ts', { '@/lib/financial-transaction': financial, '@/lib/purchase-analytics': analytics });
  const orderEvents = load('lib/order-events.ts', { '@/lib/prisma-enums': enums, '@/lib/financial-transaction': financial, '@/lib/purchase-analytics': analytics, '@/lib/product-access': {}, '@/lib/email': { sendTransactionalEmail: async () => { throw Error('Unexpected email'); } } });
  let nextStatus = 'rejected', posted = 0, verifyCalls = 0, loseResponse = false, gate = null;
  const payments = new Map(), keys = new Map(), postedKeys = [];
  const fetch = async (url, options = {}) => {
    if (url.endsWith('/v1/payments') && options.method === 'POST') {
      posted++; const key = options.headers['X-Idempotency-Key']; postedKeys.push(key);
      if (gate) await gate;
      const body = JSON.parse(options.body);
      if (!keys.has(key)) {
        const payment = { id: `p${keys.size + 1}`, status: nextStatus, transaction_amount: body.transaction_amount, currency_id: 'UYU', external_reference: body.external_reference, metadata: body.metadata };
        keys.set(key,payment); payments.set(payment.id,payment);
      }
      if (loseResponse) { loseResponse = false; throw Error('connection lost after provider accepted request'); }
      return new Response(JSON.stringify(keys.get(key)), { status: 201 });
    }
    if (url.includes('/v1/payments/search')) return new Response(JSON.stringify({ results: [...payments.values()] }));
    verifyCalls++; const payment = payments.get(url.split('/').pop());
    assert.ok(payment, 'Only known provider payments can be verified');
    return new Response(JSON.stringify(payment));
  };
  const mp = load('lib/payments/mercadopago.ts', { '@/lib/prisma': { prisma: store }, '@/lib/prisma-enums': enums, '@/lib/payments/attempts': attemptHelpers, '@/lib/financial-transaction': financial, '@/lib/order-events': orderEvents, '@/lib/purchase-analytics': analytics }, { fetch });
  return { store, mp, ...attemptHelpers, get order() { return order; }, get attempts() { return attempts; }, get events() { return events; }, get approved() { return approved; }, get canceled() { return canceled; }, get posted() { return posted; }, get verifyCalls() { return verifyCalls; }, payments, postedKeys,
    status: status => nextStatus = status, lose: () => loseResponse = true, gate: promise => gate = promise, get charges() { return keys.size; } };
}
const formData = { token: 'fixture-token', payment_method_id: 'visa', installments: 1, transaction_amount: 1, payer: { email: 'fixture@example.test' } };
(async () => {
  let f = fixture();
  const [prepared, duplicate] = await Promise.all([f.preparePaymentAttempt('order'), f.preparePaymentAttempt('order')]);
  assert.equal(prepared.id, duplicate.id); assert.equal(f.attempts.length,1);
  const rejected = await f.mp.createMercadoPagoPayment({ orderId: 'order', attemptId: prepared.id, formData });
  assert.equal(rejected.status,'rejected'); assert.equal(f.order.status,'PENDING'); assert.equal(f.approved,0); assert.equal(f.canceled,0);
  assert.equal(f.payments.get('p1').transaction_amount,9900, 'Client amount never changes the total');
  const retry = await f.preparePaymentAttempt('order'); assert.notEqual(retry.id, prepared.id);
  f.status('approved');
  const approved = await f.mp.createMercadoPagoPayment({ orderId: 'order', attemptId: retry.id, formData: { ...formData, token: 'second-token', payment_method_id: 'master' } });
  assert.equal(approved.status,'approved'); assert.equal(f.order.status,'PAID'); assert.equal(f.approved,1); assert.ok(f.verifyCalls >= 2);
  await f.mp.syncOrderWithMercadoPagoPayment(f.payments.get('p2'));
  await f.mp.syncOrderWithMercadoPagoPayment(f.payments.get('p1'));
  assert.equal(f.order.status,'PAID'); assert.equal(f.approved,1); assert.equal(f.events.filter(e => e.name === 'purchase_approved').length,1);
  console.log('PASS: rejected payment, different-method retry, unchanged totals, single commission approval and late/repeated notifications.');

  f = fixture(); f.status('approved'); const attempt = await f.preparePaymentAttempt('order');
  let release; f.gate(new Promise(resolve => release = resolve));
  const first = f.mp.createMercadoPagoPayment({ orderId:'order', attemptId:attempt.id, formData });
  while (!f.posted) await new Promise(resolve => setImmediate(resolve));
  const parallel = await f.mp.createMercadoPagoPayment({ orderId:'order', attemptId:attempt.id, formData });
  assert.equal(parallel.status,'processing'); assert.equal(f.posted,1);
  release(); await first; assert.equal(f.charges,1); assert.equal(f.approved,1);
  console.log('PASS: simultaneous confirmations send one provider request and approve once.');

  f = fixture(); f.status('approved'); const uncertain = await f.preparePaymentAttempt('order'); f.lose();
  await assert.rejects(f.mp.createMercadoPagoPayment({ orderId:'order', attemptId:uncertain.id, formData }), /verific/);
  assert.equal(f.order.status,'PENDING'); assert.equal(f.approved,0); assert.equal(f.attempts[0].status,'unknown');
  assert.equal((await f.preparePaymentAttempt('order')).id,uncertain.id);
  await assert.rejects(f.mp.createMercadoPagoPayment({ orderId:'order', attemptId:uncertain.id, formData: { ...formData, token:'changed' } }), /No cambies/);
  await f.mp.createMercadoPagoPayment({ orderId:'order', attemptId:uncertain.id, formData });
  assert.equal(f.postedKeys[0],f.postedKeys[1]); assert.equal(f.charges,1); assert.equal(f.approved,1);
  assert.ok(!JSON.stringify(f.attempts).includes('fixture-token'));
  console.log('PASS: response loss preserves idempotency, blocks changed payloads and verifies before granting access.');

  f = fixture(); const pending = await f.preparePaymentAttempt('order'); f.status('pending');
  await f.mp.createMercadoPagoPayment({ orderId:'order', attemptId:pending.id, formData });
  assert.equal(f.approved,0); assert.equal((await f.preparePaymentAttempt('order')).id,pending.id);
  const payment = f.payments.get('p1'); payment.status = 'approved';
  const webhook = load('app/api/payments/mercadopago/webhook/route.ts', { 'next/server': { NextResponse: { json: (body,init) => ({ body, status: init?.status ?? 200 }) } }, '@/lib/payments/mercadopago': f.mp });
  const req = () => ({ json: async () => ({ type:'payment', data:{ id:'p1' } }), nextUrl:new URL('https://example.invalid/webhook'), headers:new Headers() });
  await Promise.all([webhook.POST(req()),webhook.POST(req()),webhook.POST(req())]);
  assert.equal(f.approved,1); assert.equal(f.events.filter(e=>e.name === 'purchase_approved').length,1);
  assert.equal(f.order.status,'PAID');
  console.log('PASS: pending payment later approved by repeated concurrent webhooks; approved purchase event deduplicated.');

  f = fixture(); f.status('approved'); const httpAttempt = await f.preparePaymentAttempt('order');
  const confirm = load('app/api/payments/mercadopago/confirm/route.ts', {
    'next/server': { NextResponse: { json:(body,init)=>({body,status:init?.status??200}) } },
    '@/lib/prisma':{prisma:f.store},'@/lib/prisma-enums':load('lib/prisma-enums.ts',{}),
    '@/lib/payments/mercadopago':f.mp,'@/lib/payments/attempts':f,
    '@/lib/purchase-analytics':load('lib/purchase-session.ts',{}),'@/lib/rate-limit':{rateLimit:()=>({ok:true})},
  });
  const confirmation=()=>({json:async()=>({orderId:'order',attemptId:httpAttempt.id,formData})});
  const responses=await Promise.all([confirm.POST(confirmation()),confirm.POST(confirmation())]);
  assert.ok(responses.every(r=>r.body.ok));assert.equal(f.charges,1);assert.equal(f.approved,1);
  const replay=await confirm.POST(confirmation());assert.equal(replay.body.payment.status,'approved');assert.equal(f.charges,1);
  const invalid=await confirm.POST({json:async()=>({orderId:'order',attemptId:'forged',formData})});assert.equal(invalid.status,400);
  console.log('PASS: HTTP confirm route accepts concurrent/replayed requests without another charge and rejects forged attempt identifiers.');

  f = fixture(); const wallet = await f.preparePaymentAttempt('order');
  const walletHash = crypto.createHash('sha256').update('wallet:fixture').digest('hex');
  assert.equal((await f.claimPaymentAttempt('order',wallet.id,walletHash,'wallet')).send,true);
  await f.store.paymentAttempt.update({where:{id:wallet.id},data:{status:'pending_wallet',startedAt:new Date(0)}});
  assert.equal((await f.claimPaymentAttempt('order',wallet.id,walletHash,'wallet')).send,false);
  assert.equal((await f.preparePaymentAttempt('order')).id,wallet.id);
  await assert.rejects(f.claimPaymentAttempt('order',wallet.id,'another-method','visa'),/No cambies/);
  console.log('PASS: Wallet cannot release a second redirect or change methods while its result is unknown, even after the claim lease expires.');

  f = fixture(); const previous = await f.preparePaymentAttempt('order');
  await f.mp.createMercadoPagoPayment({orderId:'order',attemptId:previous.id,formData});
  const walletRetry = await f.preparePaymentAttempt('order');
  await f.claimPaymentAttempt('order',walletRetry.id,walletHash,'wallet');
  await f.store.paymentAttempt.update({where:{id:walletRetry.id},data:{status:'pending_wallet'}});
  await f.mp.reconcileMercadoPagoOrder('order');
  assert.equal(f.attempts.find(a=>a.id===walletRetry.id).status,'pending_wallet');
  assert.equal(f.attempts.find(a=>a.id===walletRetry.id).paymentId,null);
  assert.equal(f.order.paymentStatus,'processing');
  const legacyReject = {id:'legacy',status:'rejected',external_reference:'order',transaction_amount:9900,currency_id:'UYU',date_created:new Date(0).toISOString()};
  await f.mp.syncOrderWithMercadoPagoPayment(legacyReject);
  assert.equal(f.order.paymentStatus,'processing');
  const walletPayment = {...legacyReject,id:'wallet-payment',status:'pending',date_created:new Date(Date.now()+1000).toISOString()};
  f.payments.set(walletPayment.id,walletPayment);
  await f.mp.reconcileMercadoPagoOrder('order');
  assert.equal(f.attempts.find(a=>a.id===walletRetry.id).paymentId,walletPayment.id);
  assert.equal(f.order.paymentStatus,'pending');
  walletPayment.status='approved'; await f.mp.reconcileMercadoPagoOrder('order');
  assert.equal(f.order.status,'PAID'); assert.equal(f.approved,1);
  console.log('PASS: old/legacy rejections never attach to a new Wallet attempt; its own provider payment is reconciled and approved once.');
})().catch(error => { console.error(error); process.exitCode=1; });
