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
process.env.SHOPIFY_ORDER_CURRENCY = "UYU";

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
const { markOrderPaidAndNotify } = require("../lib/order-events.ts");
const { syncShopifyOrder } = require("../lib/shopify-sync.ts");

const runId = `shopify-flow-${Date.now()}`;
const shopDomain = "afilink-test.myshopify.com";
const fetchCalls = [];

global.fetch = async (url, options = {}) => {
  const parsedUrl = new URL(String(url));
  const body = options.body ? JSON.parse(String(options.body)) : null;

  fetchCalls.push({
    method: options.method || "GET",
    pathname: parsedUrl.pathname,
    body,
  });

  if (
    parsedUrl.hostname === shopDomain &&
    parsedUrl.pathname === "/admin/api/2026-04/graphql.json" &&
    options.method === "POST"
  ) {
    return jsonResponse({
      data: {
        orderCreate: {
          userErrors: [],
          order: {
            id: "gid://shopify/Order/987654321",
            name: "#1001",
          },
        },
      },
    });
  }

  return jsonResponse({ errors: [{ message: `Unexpected Shopify call: ${url}` }] }, 404);
};

function jsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status >= 200 && status < 300 ? "OK" : "Error",
    json: async () => payload,
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
        name: "Shopify Flow Seller",
        role: "SELLER",
        storeSlug: runId,
        platformCommissionValue: 5,
        platformCommissionType: "PERCENT",
      },
      select: { id: true },
    });
    sellerId = seller.id;

    await prisma.shopifyConnection.create({
      data: {
        userId: sellerId,
        shopDomain,
        accessToken: "shpat_test",
        scope: "read_products,read_inventory,write_orders",
      },
    });

    const product = await prisma.product.create({
      data: {
        sellerId,
        name: `Remera Shopify ${runId}`,
        desc: "Producto importado desde Shopify",
        price: 1600,
        stock: 5,
        category: "CLOTHING",
        sizes: ["M", "L"],
        imageUrls: ["https://cdn.example.com/shopify-shirt.jpg"],
        commissionValue: 15,
        commissionType: "PERCENT",
        platformCommissionValue: 5,
        platformCommissionType: "PERCENT",
        shopifyShopDomain: shopDomain,
        shopifyProductId: "123",
        shopifyVariantId: "111",
        shopifyVariants: [
          { id: "111", option1: "M", option2: null, option3: null },
          { id: "222", option1: "L", option2: null, option3: null },
        ],
      },
      select: { id: true },
    });
    productId = product.id;

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
      paymentId: "pay_test_shopify",
      paymentProvider: "test",
      paymentStatus: "PAID",
    });

    const paidOrder = await prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      select: {
        status: true,
        paymentStatus: true,
        shopifyShopDomain: true,
        shopifyOrderId: true,
        shopifyOrderName: true,
      },
    });
    assert.deepStrictEqual(paidOrder, {
      status: "PAID",
      paymentStatus: "PAID",
      shopifyShopDomain: shopDomain,
      shopifyOrderId: "987654321",
      shopifyOrderName: "#1001",
    });

    const decrementedProduct = await prisma.product.findUniqueOrThrow({
      where: { id: productId },
      select: { stock: true },
    });
    assert.strictEqual(decrementedProduct.stock, 3);

    const syncResult = await syncShopifyOrder(orderId);
    assert.strictEqual(syncResult.length, 1);
    assert.strictEqual(syncResult[0].status, "SYNCED");
    assert.strictEqual(syncResult[0].externalOrderId, "987654321");

    const orderCall = fetchCalls.find(
      (call) =>
        call.pathname === "/admin/api/2026-04/graphql.json" &&
        call.method === "POST"
    );
    assert.ok(orderCall, "Expected Shopify orderCreate call");
    assert.strictEqual(
      orderCall.body.variables.order.lineItems[0].variantId,
      "gid://shopify/ProductVariant/222"
    );
    assert.strictEqual(orderCall.body.variables.order.lineItems[0].quantity, 2);
    assert.strictEqual(
      orderCall.body.variables.order.transactions[0].status,
      "SUCCESS"
    );
    assert.strictEqual(
      orderCall.body.variables.order.transactions[0].amountSet.shopMoney.amount,
      3200
    );
    assert.strictEqual(
      orderCall.body.variables.options.inventoryBehaviour,
      "DECREMENT_OBEYING_POLICY"
    );
    assert.strictEqual(orderCall.body.variables.options.sendReceipt, false);

    const syncRow = await prisma.externalOrderSync.findUniqueOrThrow({
      where: {
        orderId_sellerId_channel: {
          orderId,
          sellerId,
          channel: "shopify",
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
      externalOrderId: "987654321",
      error: null,
    });

    console.log("Shopify flow verification passed");
  } finally {
    if (orderId) {
      await prisma.notification.deleteMany({ where: { orderId } });
      await prisma.externalOrderSync.deleteMany({ where: { orderId } });
      await prisma.order.deleteMany({ where: { id: orderId } });
    }
    if (productId) {
      await prisma.product.deleteMany({ where: { id: productId } });
    }
    if (sellerId) {
      await prisma.shopifyConnection.deleteMany({ where: { userId: sellerId } });
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
