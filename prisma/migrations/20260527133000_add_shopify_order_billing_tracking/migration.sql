ALTER TABLE "Order"
ADD COLUMN "shopifyShopDomain" VARCHAR(191),
ADD COLUMN "shopifyOrderId" VARCHAR(80),
ADD COLUMN "shopifyOrderName" VARCHAR(80),
ADD COLUMN "shopifyBillingStatus" VARCHAR(50),
ADD COLUMN "shopifyBillingUsageRecordId" VARCHAR(191),
ADD COLUMN "shopifyBillingError" TEXT;

CREATE UNIQUE INDEX "Order_shopifyShopDomain_shopifyOrderId_key" ON "Order"("shopifyShopDomain", "shopifyOrderId");
CREATE INDEX "Order_shopifyShopDomain_idx" ON "Order"("shopifyShopDomain");
CREATE INDEX "Order_shopifyOrderId_idx" ON "Order"("shopifyOrderId");

CREATE TABLE "ShopifyBillingCharge" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "shopDomain" VARCHAR(191) NOT NULL,
  "shopifyOrderId" VARCHAR(80) NOT NULL,
  "amount" INTEGER NOT NULL,
  "currency" VARCHAR(10) NOT NULL,
  "status" VARCHAR(50) NOT NULL,
  "usageRecordId" VARCHAR(191),
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ShopifyBillingCharge_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopifyBillingCharge_orderId_key" ON "ShopifyBillingCharge"("orderId");
CREATE INDEX "ShopifyBillingCharge_shopDomain_idx" ON "ShopifyBillingCharge"("shopDomain");
CREATE INDEX "ShopifyBillingCharge_shopifyOrderId_idx" ON "ShopifyBillingCharge"("shopifyOrderId");
CREATE INDEX "ShopifyBillingCharge_status_idx" ON "ShopifyBillingCharge"("status");

ALTER TABLE "ShopifyBillingCharge"
ADD CONSTRAINT "ShopifyBillingCharge_orderId_fkey"
FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
