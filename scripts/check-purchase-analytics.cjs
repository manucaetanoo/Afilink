const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');
function load(file,mocks,globals={}) {
  const sandboxModule={exports:{}};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,
    {module:sandboxModule,exports:sandboxModule.exports,Buffer,console,URL,process:{env:{}},...globals,require:name => name==='crypto'?crypto : name in mocks ? mocks[name] : (()=>{throw Error(name)})()});
  return sandboxModule.exports;
}
(async()=>{
  let sessionCookie;
  const events=[];
  const sessionHelpers=load('lib/purchase-session.ts',{});
  const prisma={purchaseEvent:{createMany:async({data,skipDuplicates})=>{
    assert.equal(skipDuplicates,true); for(const event of data) if(!events.some(e=>e.eventKey===event.eventKey))events.push(event);
  }},product:{findUnique:async()=>({id:'product'})},order:{findUnique:async()=>({productId:'product',sessionId:sessionCookie})}};
  const analytics=load('lib/purchase-analytics.ts',{'@/lib/prisma':{prisma},'@/lib/purchase-session':sessionHelpers,'next/headers':{cookies:async()=>({get:()=>({value:sessionCookie}),set:(_key,value,options)=>{assert.equal(options.httpOnly,true);assert.equal(options.maxAge,1800);sessionCookie=value;}})}});
  const initial=await analytics.getPurchaseSession();assert.equal(await analytics.getPurchaseSession(),initial);
  sessionCookie=undefined;assert.notEqual(await analytics.getPurchaseSession(),initial);
  const route=load('app/api/analytics/purchase/route.ts',{'next/server':{NextResponse:{json:(body,init)=>({body,status:init?.status??200})}},'@/lib/prisma':{prisma},'@/lib/purchase-analytics':analytics,'@/lib/rate-limit':{rateLimit:()=>({ok:true})}});
  const request=(body,origin='https://example.invalid',ua='Mozilla/5.0 iPhone Mobile')=>({url:'https://example.invalid/api/analytics/purchase',headers:new Headers({'origin':origin,'user-agent':ua}),json:async()=>body});
  await Promise.all([route.POST(request({name:'product_view',productId:'product'})),route.POST(request({name:'product_view',productId:'product'}))]);
  assert.equal(events.length,1);assert.equal(events[0].device,'mobile');
  assert.equal((await route.POST(request({name:'purchase_approved',orderId:'order'}))).status,400);
  assert.equal((await route.POST(request({name:'payment_ready',orderId:'order'},'https://attacker.invalid'))).status,403);
  await route.POST(request({name:'product_view',productId:'product'},'https://example.invalid','Googlebot'));
  assert.equal(events.length,1);
  assert.ok(!JSON.stringify(events).includes('email'));
  console.log('PASS: stable/renewed anonymous sessions, concurrent event deduplication, mobile classification, bots and forged approvals rejected.');
  const calls=[],storage=new Map();
  const tracking=load('lib/purchase-tracking.ts',{'@/lib/meta-pixel':{trackMetaCommerce:(...args)=>calls.push(['meta',...args])}}, {window:{gtag:(...args)=>calls.push(['ga',...args]),localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)}},fetch:async()=>({ok:true})});
  tracking.trackPurchaseStage('product_view','product');tracking.trackPurchaseStage('product_view','product');
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls.filter(c=>c[0]==='ga'&&c[2]==='view_item').length,1);
  tracking.trackVerifiedPurchase('verified-order','product',9900);tracking.trackVerifiedPurchase('verified-order','product',9900);
  assert.equal(calls.filter(c=>c[0]==='ga'&&c[2]==='purchase').length,1);
  assert.equal(calls.find(c=>c[0]==='ga'&&c[2]==='purchase')[3].transaction_id,'verified-order');
  console.log('PASS: existing GA4/Meta integrations reused and purchase uses a deduplicated transaction ID.');
})().catch(error=>{console.error(error);process.exitCode=1;});
