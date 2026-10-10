const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = ts.transpileModule(fs.readFileSync('components/BuyButton.tsx', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
function mount(fetch, disabled = false) {
  const states = [];
  const module = { exports: {} };
  const window = { location: { href: '' } };
  const jsx = (type, props) => ({ type, props });
  vm.runInNewContext(source, { module, exports: module.exports, window, fetch, require: name => {
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name === '@/lib/purchase-tracking') return { trackPurchaseStage: () => {} };
    if (name === 'react') return { useId: () => 'test-error', useRef: value => ({ current: value }), useState: initial => { const i = states.length; states.push(initial); return [initial, value => states[i] = value]; } };
    throw new Error(name);
  } });
  const root = module.exports.BuyButton({ productId: 'course', refCode: 'affiliate', disabled });
  return { click: root.props.children[0].props.onClick, states, window };
}
(async () => {
  let requests = 0, resolve;
  const deferred = new Promise(r => resolve = r);
  const ok = mount(async (url, options) => { requests++; assert.equal(url, '/api/checkout'); assert.equal(JSON.parse(options.body).refCode, 'affiliate'); return deferred; });
  const first = ok.click(); await ok.click();
  assert.equal(requests, 1); assert.equal(ok.states[0], true);
  resolve({ ok: true, json: async () => ({ ok: true, checkout: { url: '/checkout?items=test' } }) });
  await first; assert.equal(ok.window.location.href, '/checkout?items=test');
  for (const fetch of [async () => { throw new Error('offline'); }, async () => ({ ok: false, json: async () => ({ ok: false }) }), async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }), async () => ({ ok: true, json: async () => ({ ok: true }) })]) {
    let retries = 0;
    const failed = mount(async (...args) => { retries++; return fetch(...args); });
    await failed.click(); assert.equal(failed.states[0], false); assert.match(failed.states[1], /volvé a intentarlo/); assert.equal(failed.window.location.href, '');
    await failed.click(); assert.equal(retries, 2);
  }
  const unavailable = mount(async () => { throw new Error('must not fetch'); }, true);
  await unavailable.click(); assert.equal(unavailable.states[0], false);
  console.log('PASS: pending state, duplicate click guard, referral preserved, navigation, network/HTTP/JSON failures, retry and disabled purchase. No real checkout requests.');
})().catch(error => { console.error(error); process.exitCode = 1; });
