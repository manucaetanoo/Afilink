// Browser fixture of the actual catalog components, independent of live database data.
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
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'afilink-catalog-browser-'));
const write = (name, content) => fs.writeFileSync(path.join(tmp, name), content);
for (const [source, target] of [
  ['components/ProductsCatalogClient.tsx', 'Catalog.js'],
  ['components/ProductCard.tsx', 'Card.js'],
  ['lib/product-categories.ts', 'categories.js'],
]) write(target, ts.transpileModule(fs.readFileSync(source, 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
}).outputText);
write('navigation.js', 'export const useRouter=()=>window.fixtureRouter;');
write('session.js', 'export const useSession=()=>({data:null});');
// Keep the small stubs as plain JS for webpack.
write('link.js', 'import React from "react"; export default function Link({href,children,...props}){return React.createElement("a",{href,...props},children)}');
write('image.js', 'import React from "react"; export default function Image({fill,...props}){return React.createElement("img",props)}');
write('entry.js', `
import React from 'react'; import {createRoot} from 'react-dom/client'; import Catalog from './Catalog.js';
import {normalizeCatalogFilter,isProductCategory} from './categories.js';
const root=createRoot(document.getElementById('root'));
const products=[
 {id:'a',name:'Python inicial',desc:'Curso práctico',category:'tecnologia'},
 {id:'b',name:'Python avanzado',desc:'Programación',category:'tecnologia'},
 {id:'c',name:'Taller de electricidad',desc:'Instalaciones',category:'oficios'},
 {id:'d',name:'Marketing digital',desc:'Redes sociales',category:'marketing'},
 {id:'e',name:'Cocina casera',desc:'Recetas',category:'gastronomia'},
].map(p=>({...p,price:1200,commissionValue:20,imageUrls:[]}));
function render(){
 const params=new URLSearchParams(location.search),q=params.get('q')||'',category=normalizeCatalogFilter(params.get('category')),page=Number(params.get('page')||1);
 const filtered=products.filter(p=>(!isProductCategory(category)||p.category===category)&&(!q||(p.name+' '+p.desc).toLowerCase().includes(q.toLowerCase())));
 root.render(React.createElement(Catalog,{products:filtered.slice((page-1)*2,page*2),pageSize:2,hasMoreInitial:page*2<filtered.length,totalInitial:filtered.length,search:q,category,currentPage:page}));
}
window.fixtureRouter={push(url){history.pushState({},'',url);render()}};
window.addEventListener('popstate',render);render();
`);
let browser, server;
(async () => {
  await new Promise((resolve, reject) => webpack({
    mode: 'development', entry: path.join(tmp, 'entry.js'), output: { path: tmp, filename: 'bundle.js' },
    resolve: { modules: [path.join(root, 'node_modules')], alias: {
      'next/navigation': path.join(tmp, 'navigation.js'), 'next-auth/react': path.join(tmp, 'session.js'),
      'next/link': path.join(tmp, 'link.js'), 'next/image': path.join(tmp, 'image.js'),
      '@/components/ProductCard': path.join(tmp, 'Card.js'), '@/lib/product-categories': path.join(tmp, 'categories.js'),
    } }, devtool: false,
  }, (error, stats) => error ? reject(error) : stats.hasErrors() ? reject(Error(stats.toString({ all: false, errors: true }))) : resolve()));
  const css = await postcss([require('@tailwindcss/postcss')({ base: root })]).process('@import "tailwindcss";', { from: path.join(root, 'app/catalog-browser-test.css') });
  server = http.createServer((req, res) => {
    if (req.url === '/bundle.js') { res.setHeader('Content-Type', 'text/javascript'); return res.end(fs.readFileSync(path.join(tmp, 'bundle.js'))); }
    if (req.url === '/styles.css') { res.setHeader('Content-Type', 'text/css'); return res.end(css.css); }
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.end('<!doctype html><html lang="es"><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/styles.css"></head><body><main class="mx-auto max-w-6xl px-5 py-8"><h1 class="mb-8 text-3xl font-bold">Explorá el catálogo</h1><div id="root"></div></main><script src="/bundle.js"></script></body></html>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  browser = await chromium.launch({ headless: true, ...(process.env.AFILINK_BROWSER_PATH ? { executablePath: process.env.AFILINK_BROWSER_PATH } : {}) });
  for (const width of [360, 768, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 } });
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto('http://127.0.0.1:' + server.address().port + '/products');
    const button = (name) => page.getByRole('button', { name, exact: true });
    const search = page.getByRole('searchbox', { name: 'Buscar cursos y productos' });
    await page.getByRole('status').filter({ hasText: '5 productos encontrados' }).waitFor();
    assert.equal(await button('Mayor comisión').getAttribute('aria-pressed'), 'true');
    for (const removed of ['Recomendado', 'Idiomas', 'Desarrollo personal']) {
      assert.equal(await button(removed).count(), 0);
    }
    await button('Siguiente').click();
    await page.waitForURL('**/products?page=2');
    await page.getByRole('heading', { name: 'Taller de electricidad' }).waitFor();
    await button('Tecnología').click();
    await page.waitForURL('**/products?category=tecnologia');
    await page.locator('button[aria-pressed="true"]').filter({ hasText: 'Tecnología' }).waitFor();
    assert.equal(await button('Tecnología').getAttribute('aria-pressed'), 'true');
    await search.fill('Python avanzado');
    await search.press('Enter');
    await page.getByRole('status').filter({ hasText: '1 producto encontrado' }).waitFor();
    assert.equal(new URL(page.url()).searchParams.get('category'), 'tecnologia');
    await page.getByRole('heading', { name: 'Python avanzado' }).waitFor();
    await button('Oficios').click();
    await page.getByRole('heading', { name: 'No encontramos resultados' }).waitFor();
    await button('Limpiar filtros').click();
    await page.waitForURL('**/products');
    await page.getByRole('status').filter({ hasText: '5 productos encontrados' }).waitFor();
    assert.equal(await search.inputValue(), '');
    assert.equal(await button('Mayor comisión').getAttribute('aria-pressed'), 'true');
    await page.goBack();
    await page.getByRole('heading', { name: 'No encontramos resultados' }).waitFor();
    assert.equal(await search.inputValue(), 'Python avanzado');
    await page.reload();
    await page.getByRole('heading', { name: 'No encontramos resultados' }).waitFor();
    await button('Limpiar filtros').click();
    await page.getByRole('status').filter({ hasText: '5 productos encontrados' }).waitFor();
    assert.equal(await button('Mayor comisión').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'No horizontal overflow at ' + width + 'px');
    assert.deepEqual(errors, []);
    if (process.env.AFILINK_CATALOG_SCREENSHOT_DIR) {
      await page.screenshot({ path: path.join(process.env.AFILINK_CATALOG_SCREENSHOT_DIR, 'catalog-' + width + '.png'), fullPage: true, animations: 'disabled' });
    }
    await page.close();
    console.log('PASS: ' + width + 'px search, category combinations, pagination reset, empty state, clear, back/reload and layout.');
  }
})().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
});
