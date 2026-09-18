const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks = {}) {
  const module = {exports:{}};
  const source = ts.transpileModule(fs.readFileSync(file,'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,Date,Map,Intl,require:name=>{
    if(name==='react/jsx-runtime') return {jsx:(type,props)=>({type,props}),jsxs:(type,props)=>({type,props})};
    if(name in mocks) return mocks[name];
    throw new Error(name);
  }});
  return module.exports;
}
const helpers=load('lib/affiliate-dashboard.ts');
const activity=load('lib/affiliate-activity.ts');
const now=new Date('2026-09-18T12:00:00Z');
const link=(id,name,count,date)=>({affiliateId:id,affiliate:{name},_count:{clicks:count},clicks:date?[{createdAt:new Date(date)}]:[]});
const links=[link('a','Ana',200,'2026-09-01'),link('a','Ana',300,'2026-09-17'),link('b','Ana',71,'2026-09-15'),link('c',null,0)];
const summary=activity.summarizeAffiliateActivity(links);
assert.equal(summary.clicks,571);
assert.equal(summary.affiliatesWithClicks,2);
assert.equal(summary.rows[0].clicks,500);
assert.equal(summary.rows[0].linksWithClicks,2);
assert.equal(summary.rows[0].lastClick.toISOString(),'2026-09-17T00:00:00.000Z');
assert.equal(summary.rows[1].id,'b'); // Same name, different accounts.
assert.equal(activity.summarizeAffiliateActivity([]).affiliatesWithClicks,0);
assert.equal(activity.summarizeAffiliateActivity([link('x',null,1,'2026-09-01')]).rows[0].name,'Sin nombre');
function text(node){return Array.isArray(node)?node.map(text).join(' '):node==null?'':typeof node==='object'?text(node.props?.children):String(node);}
async function render(role,period='30',sellerId='seller-a'){
  const calls=[];
  const page=load('app/admin/affiliates/page.tsx',{
    'next/navigation':{redirect:path=>{throw Error(`REDIRECT:${path}`)}},
    'next-auth':{getServerSession:async()=>role?{user:{id:'admin',role}}:null},
    '@/components/Navbar':{},'@/components/Sidebar':{},
    '@/app/api/auth/[...nextauth]/route':{authOptions:{}},
    '@/lib/affiliate-dashboard':{...helpers,getDashboardPeriod:value=>helpers.getDashboardPeriod(value,now)},
    '@/lib/affiliate-activity':activity,
    '@/lib/prisma':{prisma:{
      user:{findMany:async()=>{calls.push('users');return [{id:'seller-a',name:'Seller',email:'seller@example.com'}]}},
      affiliateLink:{findMany:async args=>{calls.push(args);return links;}}
    }}
  }).default;
  try{
    const tree=await page({searchParams:Promise.resolve({period,sellerId})});
    if(sellerId!=='seller-a') {assert.equal(calls.length,1);assert.ok(!text(tree).includes('571'));return;}
    assert.equal(calls[1].where.product.sellerId,'seller-a');
    const selected=calls[1].select;
    const dates=selected._count.select.clicks.where.createdAt;
    assert.equal(dates,selected.clicks.where.createdAt);
    assert.equal(dates.lte.toISOString(),now.toISOString());
    assert.equal(dates.gte?.toISOString(),helpers.getDashboardPeriod(period,now).start?.toISOString());
    assert.equal(selected.clicks.take,1);
    assert.equal(selected.clicks.orderBy.createdAt,'desc');
    assert.ok(text(tree).includes('571'));
    assert.ok(text(tree).includes('Afiliados con clics'));
  }catch(error){assert.equal(calls.length,0,'Unauthorized users must not query data');throw error;}
}
(async()=>{
  for(const role of [null,'AFFILIATE','SELLER']) await assert.rejects(render(role),/REDIRECT/);
  for(const period of ['7','30','90','all','invalid']) await render('ADMIN',period);
  await render('ADMIN','30','missing');
  await render('ADMIN','30',undefined);
  console.log('PASS: ADMIN guard before queries, seller scope, shared period for totals/latest clicks, 7/30/90/all, invalid seller, multiple links per account, namesakes, ordering, 571-click reconciliation and empty activity. Fixture data only.');
})().catch(error=>{console.error(error);process.exitCode=1});
