const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, imports = {}) {
  const exports = {};
  const compiled = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(compiled, {
    exports, require: (name) => name in imports ? imports[name] : require(name), URL, URLSearchParams,
  }, { filename: file });
  return exports;
}

(async () => {
  const categories = load('lib/product-categories.ts');
  const calls = [];
  const products = [
    { id: 'a', name: 'Python inicial', desc: 'Curso práctico', category: 'tecnologia', commissionValue: 10, isActive: true, imageUrls: [], _count: { links: 4 } },
    { id: 'b', name: 'Python avanzado', desc: 'Curso práctico', category: 'tecnologia', commissionValue: 40, isActive: true, imageUrls: [], _count: { links: 2 } },
    { id: 'c', name: 'Python oculto', desc: 'Curso práctico', category: 'tecnologia', commissionValue: 100, isActive: false, imageUrls: [], _count: { links: 0 } },
    { id: 'd', name: 'Taller de electricidad', desc: 'Instalaciones domésticas', category: 'oficios', commissionValue: 20, isActive: true, imageUrls: [], _count: { links: 0 } },
  ];
  const match = (product, where) => product.isActive === where.isActive
    && (!where.category || (typeof where.category === 'string'
      ? product.category === where.category : where.category.in.includes(product.category)))
    && (!where.AND || where.AND.every(({ OR }) => OR.some((condition) => {
      const [field, { contains }] = Object.entries(condition)[0];
      return (product[field] || '').toLowerCase().includes(contains.toLowerCase());
    })));
  const prisma = { product: {
    findMany: async (args) => {
      calls.push(args);
      const sorted = products.filter((product) => match(product, args.where)).sort((a, b) => {
        for (const order of args.orderBy) {
          const [field, direction] = Object.entries(order)[0];
          const left = field === 'links' ? a._count.links : a[field];
          const right = field === 'links' ? b._count.links : b[field];
          if (left === right) continue;
          const comparison = left < right ? -1 : left > right ? 1 : 0;
          if (comparison) return direction === 'asc' ? comparison : -comparison;
        }
        return 0;
      });
      return sorted.slice(args.skip, args.skip + args.take);
    },
    count: async ({ where }) => products.filter((product) => match(product, where)).length,
  } };
  const catalog = load('lib/products-catalog.ts', {
    '@/lib/prisma': { prisma }, '@/lib/product-categories': categories,
    '@/lib/product-images': { getRenderableProductImageUrls: (urls) => urls },
  });

  assert.equal(categories.normalizeCatalogFilter('inventada'), 'mayor-comision');
  assert.equal(categories.normalizeCatalogFilter(undefined), 'mayor-comision');
  for (const removed of ['recomendado', 'idiomas']) {
    assert.equal(categories.normalizeCatalogFilter(removed), 'mayor-comision');
    assert.equal(categories.CATALOG_FILTERS.some((filter) => filter.value === removed), false);
  }
  assert.equal(categories.normalizeCatalogFilter('desarrollo-personal'), 'bienestar');
  assert.equal(categories.normalizeProductCategory('desarrollo-personal'), 'bienestar');
  assert.equal(categories.PRODUCT_CATEGORIES.some((category) => category.value === 'desarrollo-personal'), false);
  assert.equal(categories.CATALOG_FILTERS.find((filter) => filter.value === 'bienestar').label, 'Desarrollo y bienestar');
  assert.equal(categories.normalizeCatalogFilter('mayor-comision'), 'mayor-comision');
  assert.equal(categories.isProductCategory('recomendado'), false);
  assert.equal(categories.isProductCategory('mayor-comision'), false);
  assert.equal(categories.normalizeCatalogSearch(['python']), '');
  assert.equal(categories.normalizeCatalogSearch('  Python   inicial  '), 'Python inicial');
  assert.equal(categories.normalizeCatalogSearch('x'.repeat(200)).length, 140);
  assert.equal(categories.catalogHref('', 'mayor-comision'), '/products');
  const href = new URL(categories.catalogHref('C++ & Python', 'tecnologia', 2), 'http://local');
  assert.equal(href.searchParams.get('q'), 'C++ & Python');
  assert.equal(href.searchParams.get('category'), 'tecnologia');
  assert.equal(href.searchParams.get('page'), '2');

  let result = await catalog.getCatalogProducts({ search: 'PYTHON práctico', category: 'tecnologia', take: 1 });
  assert.equal(result.total, 2, 'Count includes matching products beyond the first page and excludes inactive products');
  assert.equal(result.products[0].id, 'b');
  assert.equal(result.products[0].affiliateCount, 2);
  assert.equal(result.hasMore, true);
  result = await catalog.getCatalogProducts({ search: 'PYTHON práctico', category: 'tecnologia', take: 1, skip: 1 });
  assert.equal(result.products[0].id, 'a');
  assert.equal(result.total, 2);
  assert.equal(result.hasMore, false);
  result = await catalog.getCatalogProducts({ search: 'python', category: 'oficios' });
  assert.equal(result.total, 0, 'Category and search combine instead of overriding each other');
  result = await catalog.getCatalogProducts({ search: 'domésticas', category: 'oficios' });
  assert.equal(result.products[0].id, 'd', 'Descriptions are searchable');
  result = await catalog.getCatalogProducts();
  assert.equal(Array.from(result.products, (product) => product.id).join(','), 'b,d,a', 'Default prioritizes commission percentage across all categories, excluding inactive products');
  assert.equal(calls.at(-1).where.category, undefined, 'Mayor comisión is an ordering, not a stored category');
  result = await catalog.getCatalogProducts({ category: 'recomendado' });
  assert.equal(Array.from(result.products, (product) => product.id).join(','), 'b,d,a', 'Removed filter URLs use the default order');
  assert.equal(calls.at(-1).orderBy.at(-1).id, 'asc', 'Stable ordering prevents page duplicates for tied products');
  await catalog.getCatalogProducts({ category: 'todos' });
  assert.equal(calls.at(-1).orderBy[0].createdAt, 'desc');

  const response = { json: (body, init) => ({ body, status: init?.status || 200 }) };
  const api = load('app/api/products/route.ts', {
    '@/lib/products-catalog': catalog, '@/lib/product-categories': categories,
    'next/server': { NextResponse: response },
  });
  result = await api.GET({ url: 'http://local/api/products?q=Python&category=tecnologia&take=1&skip=1' });
  assert.equal(result.body.total, 2);
  assert.equal(result.body.products[0].id, 'a');
  result = await api.GET({ url: 'http://local/api/products' });
  assert.equal(result.body.products[0].id, 'b', 'API without filters uses highest commission');
  assert.equal(result.body.total, 3);
  await api.GET({ url: 'http://local/api/products?take=0&skip=-1' });
  assert.equal(calls.at(-1).take, 40);
  assert.equal(calls.at(-1).skip, 0);

  const health = { id: 'health', name: 'Bienestar físico', desc: 'Hábitos saludables', category: 'bienestar', commissionValue: 30, isActive: true, imageUrls: [], _count: { links: 0 } };
  const personal = { ...health, id: 'personal', name: 'Desarrollo personal', category: 'desarrollo-personal', commissionValue: 15 };
  products.push(health, personal, { ...personal, id: 'hidden-personal', isActive: false });
  result = await catalog.getCatalogProducts({ category: 'bienestar', take: 1 });
  assert.equal(result.total, 2, 'Merged category counts both groups and excludes inactive products');
  assert.equal(result.products[0].id, 'health');
  assert.equal(result.hasMore, true);
  result = await catalog.getCatalogProducts({ category: 'bienestar', take: 1, skip: 1 });
  assert.equal(result.products[0].id, 'personal');
  assert.equal(result.hasMore, false);
  result = await catalog.getCatalogProducts({ category: 'desarrollo-personal', search: 'personal' });
  assert.equal(result.total, 1, 'Legacy URLs use the merged category and preserve search');
  assert.equal(result.products[0].id, 'personal');

  const sellerImports = {
    '@/lib/prisma': { prisma }, '@/lib/product-categories': categories,
    '@/lib/auth': { requireUser: async () => ({ id: 'seller', role: 'SELLER' }), requireRole: () => {} },
    '@/lib/product-images': { normalizeProductImageUrls: () => [] },
    '@/lib/product-access': { normalizeProductDigitalAccessType: () => 'IMMEDIATE' },
    'next/server': { NextResponse: response }, 'next/cache': { revalidatePath: () => {}, revalidateTag: () => {} },
  };
  const create = load('app/api/seller/products/route.ts', sellerImports);
  const edit = load('app/api/seller/products/[id]/route.ts', sellerImports);
  assert.equal((await create.POST({ json: async () => ({ category: 'inventada' }) })).status, 400);
  assert.equal((await edit.PATCH({ json: async () => ({ category: 'recomendado' }) }, { params: Promise.resolve({ id: 'a' }) })).status, 400);
  let updatedCategory;
  prisma.product.update = async ({ data }) => {
    updatedCategory = data.category;
    return { id: 'personal' };
  };
  assert.equal((await edit.PATCH({ json: async () => ({ category: 'desarrollo-personal' }) }, { params: Promise.resolve({ id: 'personal' }) })).status, 200);
  assert.equal(updatedCategory, 'bienestar', 'Editing a legacy product saves the unified category');
  console.log('PASS: combined search/category, descriptions, pagination totals, commission ordering, removed filters, URL encoding, input bounds and seller category validation.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
