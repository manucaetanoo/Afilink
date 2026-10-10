// Isolated browser fixture of the actual checkout component. No DB or MP SDK.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const ts = require('typescript');
const postcss = require('postcss');
const webpackPackage = require('next/dist/compiled/webpack/webpack');
const webpack = webpackPackage.webpack || webpackPackage.default;
const { chromium } = require(process.env.AFILINK_PLAYWRIGHT_PATH || 'playwright');
const root = process.cwd();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(),'afilink-checkout-browser-'));
const write = (name,content) => fs.writeFileSync(path.join(tmp,name),content);
const transpile = source => ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
write('Checkout.js',transpile(fs.readFileSync('app/checkout/[orderId]/MercadoPagoCheckoutClient.tsx','utf8')));
write('script.js',`import {useEffect} from 'react'; export default function Script({onReady}){useEffect(()=>{onReady()},[]);return null}`);
write('tracking.js',`export const trackPurchaseStage=(...args)=>window.fixtureEvents.push(args);`);
write('entry.js',`
import React from 'react'; import {createRoot} from 'react-dom/client'; import Checkout from './Checkout.js';
window.fixtureEvents=[]; window.fixturePromise=null; window.fixtureMounts=0; window.fixtureOutcome=null;
window.MercadoPago=class {bricks(){return {create:async(_type,id,settings)=>{
 const generation=++window.fixtureMounts;
 window.fixtureSettings=settings; const container=document.getElementById(id); const button=document.createElement('button');
 const method=document.createElement('select');method.id='fixture-method';method.innerHTML='<option value="visa">Visa</option><option value="master">Mastercard</option>';
 button.id='fixture-pay';button.textContent='Pagar con tarjeta';button.className='min-h-12 w-full rounded-xl bg-blue-700 p-3 text-white';
 button.onclick=()=>{button.disabled=true;window.fixtureOutcome=null;window.fixtureSubmission={selectedPaymentMethod:'credit_card',formData:{token:'fixture-token-'+generation,payment_method_id:method.value}};window.fixturePromise=settings.callbacks.onSubmit(window.fixtureSubmission).then(()=>{window.fixtureOutcome='resolved'},()=>{window.fixtureOutcome='rejected';button.disabled=false;});};
 container.append(method,button);setTimeout(settings.callbacks.onReady,0);return {unmount:()=>container.replaceChildren()};
}}}};
const shipping={buyerName:'',buyerEmail:'',buyerPhone:'',shippingStreet:'',shippingNumber:'',shippingApartment:'',shippingCity:'',shippingState:'',shippingPostalCode:'',shippingCountry:'UY',shippingNotes:''};
createRoot(document.getElementById('root')).render(React.createElement(Checkout,{publicKey:'fixture',sdkUrl:'/fixture-sdk',checkoutId:'11111111-1111-4111-8111-111111111111',productId:'course',draftItems:[{productId:'course'}],order:{id:'pendiente',total:9900,subtotal:9900,status:'DRAFT',paymentStatus:null,shipping,items:[{id:'item',total:9900,selectedSize:null,selectedColor:null,product:{name:'Curso de ejemplo',desc:'Un curso digital de ejemplo.',imageUrls:[]}}]}}));
`);
let browser,server;
(async()=>{
  await new Promise((resolve,reject)=>webpack({mode:'development',entry:path.join(tmp,'entry.js'),output:{path:tmp,filename:'bundle.js'},resolve:{modules:[path.join(root,'node_modules')],alias:{'next/script':path.join(tmp,'script.js'),'@/lib/purchase-tracking':path.join(tmp,'tracking.js')}},devtool:false},(error,stats)=>error?reject(error):stats.hasErrors()?reject(Error(stats.toString({all:false,errors:true}))):resolve()));
  const css=await postcss([require('@tailwindcss/postcss')({base:root})]).process('@import "tailwindcss";',{from:path.join(root,'app/browser-test.css')});
  let confirmations=[],preparations=[],mode='reject',firstPreferenceError=false,rejectionCount=2,statusOverride=null;
  server=http.createServer(async(req,res)=>{
    if(req.url==='/bundle.js'){res.setHeader('Content-Type','text/javascript');return res.end(fs.readFileSync(path.join(tmp,'bundle.js')));}
    if(req.url==='/styles.css'){res.setHeader('Content-Type','text/css');return res.end(css.css);}
    if(req.url.startsWith('/orders/'))return res.end('<h1>Compra aprobada de prueba</h1>');
    if(req.method==='POST'){
      let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);res.setHeader('Content-Type','application/json');
      if(req.url.endsWith('/process')){
        preparations.push(body);await new Promise(resolve=>setTimeout(resolve,80));
        if(firstPreferenceError){firstPreferenceError=false;res.statusCode=500;return res.end(JSON.stringify({ok:false,orderIds:['fixture-order'],error:'Preferencia de prueba fallida'}));}
        return res.end(JSON.stringify({ok:true,orderIds:['fixture-order'],attemptId:`attempt-${preparations.length}`,payment:{status:'ready'},checkout:{preferenceId:'preference'}}));
      }
      if(req.url.endsWith('/confirm')){
        confirmations.push(body);const confirmationMode=mode;await new Promise(resolve=>setTimeout(resolve,confirmationMode==='pending'?500:80));
        if(mode==='offline'&&confirmations.length===1){req.socket.destroy();return;}
        const status=confirmationMode==='pending'?'pending':confirmationMode==='reject'&&confirmations.length<=rejectionCount?'rejected':'approved';
        const rejectionDetails=['cc_rejected_insufficient_amount','cc_rejected_high_risk','cc_rejected_other_reason','cc_rejected_bad_filled_security_code'];
        return res.end(JSON.stringify({ok:true,payment:{status,status_detail:status==='rejected'?rejectionDetails[confirmations.length-1]:undefined},checkout:{redirectUrl:status==='approved'?'/orders/fixture-order/success':null}}));
      }
      if(req.url.endsWith('/status')){const status=statusOverride??(mode==='pending'?'pending':'unknown');return res.end(JSON.stringify({ok:true,orderStatus:'PENDING',payment:{status},attemptStatus:status}));}
    }
    res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main class="min-h-screen bg-[#fffaf5] px-2 py-10 sm:px-4 md:px-8"><div class="mx-auto max-w-6xl" id="root"></div></main><script src="/bundle.js"></script></body></html>');
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const url=`http://127.0.0.1:${server.address().port}`;
  browser=await chromium.launch({headless:true, ...(process.env.AFILINK_BROWSER_PATH ? { executablePath:process.env.AFILINK_BROWSER_PATH } : {})});
  for(const width of [360,390,768,1280]){
    const context=await browser.newContext({viewport:{width,height:844}});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    confirmations=[];preparations=[];mode='reject';await page.goto(url);
    await page.getByLabel('Nombre completo').fill('Comprador de prueba');await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');await page.getByLabel('Telefono').fill('099123456');
    assert.equal(await page.getByText('Cedula del titular',{exact:true}).count(),0);
    await page.getByRole('button',{name:'Continuar al pago'}).dblclick();await page.locator('#fixture-pay').waitFor({state:'visible'});
    assert.equal(preparations.length,1,'Fast repeated Continue creates one session');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`No horizontal overflow at ${width}px`);
    await page.evaluate(()=>{document.getElementById('fixture-pay').click();void window.fixtureSettings.callbacks.onSubmit(window.fixtureSubmission).catch(()=>{});});
    await page.getByText('Mercado Pago rechazo el pago. Proba con otro medio.').first().waitFor();
    await page.evaluate(()=>window.fixturePromise);
    assert.equal(await page.evaluate(()=>window.fixtureOutcome),'rejected','A business rejection must reject the Brick callback, not signal success');
    await page.waitForFunction(()=>window.fixtureMounts===2&&!document.getElementById('fixture-pay').disabled);
    assert.equal(confirmations.length,1);await page.locator('#fixture-method').selectOption('master');await page.locator('#fixture-pay').click();
    await page.waitForFunction(()=>window.fixtureMounts===3&&!document.getElementById('fixture-pay').disabled);
    assert.equal(confirmations.length,2);await page.locator('#fixture-pay').click();await page.getByRole('heading',{name:'Compra aprobada de prueba'}).waitFor();
    assert.notEqual(confirmations[0].attemptId,confirmations[1].attemptId);assert.notEqual(confirmations[1].attemptId,confirmations[2].attemptId);
    assert.notEqual(confirmations[0].formData.token,confirmations[1].formData.token);assert.equal(confirmations[1].formData.payment_method_id,'master');
    assert.equal(confirmations.length,3);assert.equal(preparations.length,3);assert.equal(errors.length,0);
    await context.close();console.log(`PASS: ${width}px checkout, repeated insufficient-funds/risk rejections reset the Brick and allow a new-method retry without reload.`);
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  const fill=async()=>{await page.goto(url);await page.getByLabel('Nombre completo').fill('Comprador');await page.getByLabel('Email',{exact:true}).fill('buyer@example.test');await page.getByLabel('Telefono').fill('099123456');await page.getByRole('button',{name:'Continuar al pago'}).click();};
  mode='approved';confirmations=[];preparations=[];let lostBody;
  await page.route('**/confirm',async route=>{if(!lostBody){lostBody=route.request().postDataJSON();await route.abort('failed');}else await route.continue();});
  await fill();await page.locator('#fixture-pay').click();await page.getByRole('button',{name:'Reenviar el mismo intento'}).waitFor();await page.getByRole('button',{name:'Reenviar el mismo intento'}).click();await page.getByRole('heading',{name:'Compra aprobada de prueba'}).waitFor();assert.equal(lostBody.attemptId,confirmations[0].attemptId);
  await page.unroute('**/confirm');
  mode='reject';rejectionCount=4;confirmations=[];preparations=[];await fill();
  for(let rejection=0;rejection<4;rejection++){
    await page.locator('#fixture-pay').click();
    await page.waitForFunction(expected=>window.fixtureMounts===expected&&!document.getElementById('fixture-pay').disabled,rejection+2);
  }
  await page.locator('#fixture-pay').click();await page.getByRole('heading',{name:'Compra aprobada de prueba'}).waitFor();
  assert.equal(new Set(confirmations.map(c=>c.attemptId)).size,5);assert.equal(confirmations.length,5);rejectionCount=2;
  console.log('PASS: insufficient funds, risk, generic rejection and invalid security code all allow another click on Pay, without navigation or page reload.');
  mode='pending';confirmations=[];preparations=[];await fill();await page.locator('#fixture-pay').click();await page.getByRole('button',{name:'Consultar estado del pago'}).waitFor();assert.equal(await page.locator('#fixture-pay').isVisible(),false);assert.equal(await page.getByRole('button',{name:'Continuar al pago'}).isDisabled(),true);
  statusOverride='rejected';await page.getByRole('button',{name:'Consultar estado del pago'}).click();
  await page.waitForFunction(()=>window.fixtureMounts===2&&!document.getElementById('fixture-pay').disabled);
  await page.evaluate(()=>{window.fixturePreviousPromise=window.fixturePromise;});
  assert.equal(await page.getByLabel('Email',{exact:true}).inputValue(),'buyer@example.test');
  mode='reject';await page.locator('#fixture-pay').click();
  await page.waitForFunction(()=>window.fixtureMounts===3&&!document.getElementById('fixture-pay').disabled);
  await page.evaluate(()=>window.fixturePreviousPromise);
  assert.equal(await page.locator('#fixture-pay').isVisible(),true,'A late pending confirmation cannot hide the form after verified rejection');
  mode='approved';statusOverride=null;await page.locator('#fixture-pay').click();await page.getByRole('heading',{name:'Compra aprobada de prueba'}).waitFor();
  assert.equal(confirmations.length,3);assert.equal(new Set(confirmations.map(c=>c.attemptId)).size,3);
  console.log('PASS: a payment later rejected during status verification also resets the form and preserves contact details for a new attempt.');
  mode='reject';confirmations=[];preparations=[];firstPreferenceError=true;await fill();await page.getByText('Preferencia de prueba fallida').waitFor();await page.getByRole('button',{name:'Continuar al pago'}).click();await page.locator('#fixture-pay').waitFor();assert.equal(preparations[1].orderId,'fixture-order');
  console.log('PASS: mobile lost-response retry reuses attempt, pending payment locks new submission and preference failure retains the same order.');
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));const resolvedTmp=path.resolve(tmp);assert.equal(path.dirname(resolvedTmp),path.resolve(os.tmpdir()));assert.ok(path.basename(resolvedTmp).startsWith('afilink-checkout-browser-'));fs.rmSync(resolvedTmp,{recursive:true,force:true});});
