-- WooCommerce inventory/order sync support.

CREATE TABLE "WooCommerceConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "storeUrl" VARCHAR(191) NOT NULL,
    "consumerKey" TEXT NOT NULL,
    "consumerSecret" TEXT NOT NULL,
    "connectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WooCommerceConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ExternalOrderSync" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "channel" VARCHAR(40) NOT NULL,
    "externalStoreUrl" VARCHAR(191),
    "externalOrderId" VARCHAR(80),
    "status" VARCHAR(40) NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "lastAttemptAt" TIMESTAMP(3),
    "syncedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalOrderSync_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Product" ADD COLUMN "wooCommerceStoreUrl" VARCHAR(191);
ALTER TABLE "Product" ADD COLUMN "wooCommerceProductId" VARCHAR(80);
ALTER TABLE "Product" ADD COLUMN "wooCommerceVariationId" VARCHAR(80);
ALTER TABLE "Product" ADD COLUMN "wooCommerceVariants" JSONB;

CREATE UNIQUE INDEX "WooCommerceConnection_userId_key" ON "WooCommerceConnection"("userId");
CREATE UNIQUE INDEX "WooCommerceConnection_storeUrl_key" ON "WooCommerceConnection"("storeUrl");
CREATE INDEX "WooCommerceConnection_storeUrl_idx" ON "WooCommerceConnection"("storeUrl");

CREATE UNIQUE INDEX "ExternalOrderSync_orderId_sellerId_channel_key" ON "ExternalOrderSync"("orderId", "sellerId", "channel");
CREATE INDEX "ExternalOrderSync_orderId_idx" ON "ExternalOrderSync"("orderId");
CREATE INDEX "ExternalOrderSync_sellerId_idx" ON "ExternalOrderSync"("sellerId");
CREATE INDEX "ExternalOrderSync_channel_status_idx" ON "ExternalOrderSync"("channel", "status");
CREATE INDEX "ExternalOrderSync_externalStoreUrl_idx" ON "ExternalOrderSync"("externalStoreUrl");
CREATE INDEX "ExternalOrderSync_externalOrderId_idx" ON "ExternalOrderSync"("externalOrderId");

CREATE INDEX "Product_wooCommerceStoreUrl_idx" ON "Product"("wooCommerceStoreUrl");
CREATE INDEX "Product_wooCommerceProductId_idx" ON "Product"("wooCommerceProductId");
CREATE INDEX "Product_wooCommerceVariationId_idx" ON "Product"("wooCommerceVariationId");

ALTER TABLE "WooCommerceConnection" ADD CONSTRAINT "WooCommerceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ExternalOrderSync" ADD CONSTRAINT "ExternalOrderSync_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
