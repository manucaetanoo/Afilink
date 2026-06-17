const assert = require("assert");
const path = require("path");
const Module = require("module");
const ts = require("typescript");
const dotenv = require("dotenv");

const root = path.resolve(__dirname, "..");
dotenv.config({ path: path.join(root, ".env.local") });
dotenv.config({ path: path.join(root, ".env") });
delete process.env.BREVO_API_KEY;
delete process.env.BREVO_FROM_EMAIL;

const originalResolveFilename = Module._resolveFilename;
Module._resolveFilename = function resolveFilename(request, parent, isMain, options) {
  if (request.startsWith("@/")) {
    return originalResolveFilename.call(
      this,
      path.join(root, request.slice(2)),
      parent,
      isMain,
      options
    );
  }

  return originalResolveFilename.call(this, request, parent, isMain, options);
};

require.extensions[".ts"] = function loadTs(module, filename) {
  const source = require("fs").readFileSync(filename, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.React,
      module: ts.ModuleKind.CommonJS,
      moduleResolution: ts.ModuleResolutionKind.NodeJs,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: filename,
  }).outputText;

  module._compile(output, filename);
};

const { prisma } = require("../lib/prisma.ts");
const {
  importWooCommerceProductsForSeller,
} = require("../lib/woocommerce-import.ts");
const { syncWooCommerceOrder } = require("../lib/woocommerce-orders.ts");
const { markOrderPaidAndNotify } = require("../lib/order-events.ts");

const runId = `woo-flow-${Date.now()}`;
const storeUrl = "https://woo-test.example.com";
const fetchCalls = [];

global.fetch = async (url, options = {}) => {
  const parsedUrl = new URL(String(url));
  const pathname = parsedUrl.pathname;
  const body = options.body ? JSON.parse(String(options.body)) : null;

  fetchCalls.push({
    method: options.method || "GET",
    pathname,
    search: parsedUrl.search,
    body,
  });

  if (pathname === "/wp-json/wc/v3/products") {
    return jsonResponse([
      {
        id: 101,
        name: `Remera Woo ${runId}`,
        description: "<p>Producto importado desde WooCommerce</p>",
        status: "publish",
        categories: [{ name: "Ropa" }],
        images: [{ src: "https://cdn.example.com/remera.jpg" }],
        variations: [201, 202],
      },
    ]);
  }

  if (pathname === "/wp-json/wc/v3/products/101/variations") {
    return jsonResponse([
      {
        id: 201,
        price: "1500",
        stock_quantity: 3,
        in_stock: true,
        attributes: [{ name: "Talle", option: "M" }],
      },
      {
        id: 202,
        price: "1600",
        stock_quantity: 2,
        in_stock: true,
        attributes: [{ name: "Talle", option: "L" }],
      },
    ]);
  }

  if (pathname === "/wp-json/wc/v3/orders" && options.method === "POST") {
    return jsonResponse({ id: 555 });
  }

  return jsonResponse({ message: `Unexpected WooCommerce call: ${pathname}` }, 404);
};

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    text: async () => JSON.stringify(payload),
  };
}

async function main() {
  let sellerId;
  let productId;
  let orderId;

  try {
    const seller = await prisma.user.create({
      data: {
        email: `${runId}@example.com`,
        name: "Woo Flow Seller",
        role: "SELLER",
        storeSlug: runId,
        platformCommissionValue: 5,
        platformCommissionType: "PERCENT",
      },
      select: { id: true },
    });
    sellerId = seller.id;

    await prisma.wooCommerceConnection.create({
      data: {
        userId: sellerId,
        storeUrl,
        consumerKey: "ck_test",
        consumerSecret: "cs_test",
      },
    });

    const importResult = await importWooCommerceProductsForSeller({
      sellerId,
      commissionValue: 15,
    });

    assert.deepStrictEqual(importResult, { imported: 1, skipped: 0 });

    const product = await prisma.product.findFirstOrThrow({
      where: {
        sellerId,
        name: `Remera Woo ${runId}`,
      },
      select: {
        id: true,
        price: true,
        stock: true,
        sizes: true,
        wooCommerceStoreUrl: true,
        wooCommerceProductId: true,
        wooCommerceVariationId: true,
        wooCommerceVariants: true,
      },
    });
    productId = product.id;

    assert.strictEqual(product.price, 1500);
    assert.strictEqual(product.stock, 5);
    assert.deepStrictEqual(product.sizes.sort(), ["L", "M"]);
    assert.strictEqual(product.wooCommerceStoreUrl, storeUrl);
    assert.strictEqual(product.wooCommerceProductId, "101");
    assert.strictEqual(product.wooCommerceVariationId, "201");
    assert.ok(Array.isArray(product.wooCommerceVariants));

    const order = await prisma.order.create({
      data: {
        productId,
        sellerId,
        total: 3200,
        status: "PENDING",
        commissionValue: 15,
        commissionType: "PERCENT",
        affiliateAmount: 0,
        platformCommissionValue: 5,
        platformCommissionType: "PERCENT",
        platformAmount: 160,
        sellerAmount: 3040,
        paymentProvider: "test",
        paymentStatus: "pending",
        buyerName: "Comprador Test",
        buyerEmail: "buyer@example.com",
        buyerPhone: "099123456",
        shippingStreet: "Test",
        shippingNumber: "123",
        shippingCity: "Montevideo",
        shippingState: "Montevideo",
        shippingCountry: "UY",
        items: {
          create: {
            productId,
            sellerId,
            quantity: 2,
            selectedSize: "L",
            unitPrice: 1600,
            total: 3200,
            commissionValue: 15,
            commissionType: "PERCENT",
            affiliateAmount: 0,
            platformCommissionValue: 5,
            platformCommissionType: "PERCENT",
            platformAmount: 160,
            sellerAmount: 3040,
          },
        },
      },
      select: { id: true },
    });
    orderId = order.id;

    await markOrderPaidAndNotify({
      orderId,
      buyerEmail: "buyer@example.com",
      paymentId: "pay_test_woo",
      paymentProvider: "test",
      paymentStatus: "PAID",
    });

    const paidOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: { status: true, paymentStatus: true },
    });
    assert.deepStrictEqual(paidOrder, { status: "PAID", paymentStatus: "PAID" });

    const decrementedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { stock: true },
    });
    assert.strictEqual(decrementedProduct.stock, 3);

    const syncResult = await syncWooCommerceOrder(orderId);
    assert.strictEqual(syncResult.length, 1);
    assert.strictEqual(syncResult[0].status, "SYNCED");
    assert.strictEqual(syncResult[0].externalOrderId, "555");

    const orderCall = fetchCalls.find(
      (call) => call.pathname === "/wp-json/wc/v3/orders" && call.method === "POST"
    );
    assert.ok(orderCall, "Expected WooCommerce order creation call");
    assert.strictEqual(orderCall.body.status, "processing");
    assert.strictEqual(orderCall.body.set_paid, true);
    assert.strictEqual(orderCall.body.payment_method, "afilink");
    assert.strictEqual(orderCall.body.line_items.length, 1);
    assert.strictEqual(orderCall.body.line_items[0].product_id, 101);
    assert.strictEqual(orderCall.body.line_items[0].variation_id, 202);
    assert.strictEqual(orderCall.body.line_items[0].quantity, 2);

    const syncRow = await prisma.externalOrderSync.findUniqueOrThrow({
      where: {
        orderId_sellerId_channel: {
          orderId,
          sellerId,
          channel: "woocommerce",
        },
      },
      select: {
        status: true,
        externalOrderId: true,
        error: true,
      },
    });
    assert.deepStrictEqual(syncRow, {
      status: "SYNCED",
      externalOrderId: "555",
      error: null,
    });

    console.log("WooCommerce flow verification passed");
  } finally {
    if (orderId) {
      await prisma.notification.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (sellerId) {
      await prisma.wooCommerceConnection.deleteMany({ where: { userId: sellerId } });
      await prisma.user.deleteMany({ where: { id: sellerId } });
    }

    await prisma.$disconnect();
  }
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
