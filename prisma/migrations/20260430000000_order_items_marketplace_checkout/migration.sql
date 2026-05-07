-- Introduce order items so one checkout order can contain products from
-- different sellers and different affiliates.

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "affiliateId" TEXT,
    "campaignId" TEXT,
    "clickId" TEXT,
    "campaignClickId" TEXT,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" INTEGER NOT NULL,
    "total" INTEGER NOT NULL,
    "commissionValue" INTEGER NOT NULL,
    "commissionType" "CommissionType" NOT NULL,
    "affiliateAmount" INTEGER NOT NULL DEFAULT 0,
    "platformCommissionValue" INTEGER NOT NULL,
    "platformCommissionType" "CommissionType" NOT NULL,
    "platformAmount" INTEGER NOT NULL DEFAULT 0,
    "sellerAmount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id")
);

INSERT INTO "OrderItem" (
    "id",
    "orderId",
    "productId",
    "sellerId",
    "affiliateId",
    "campaignId",
    "clickId",
    "campaignClickId",
    "quantity",
    "unitPrice",
    "total",
    "commissionValue",
    "commissionType",
    "affiliateAmount",
    "platformCommissionValue",
    "platformCommissionType",
    "platformAmount",
    "sellerAmount",
    "createdAt",
    "updatedAt"
)
SELECT
    'item_' || "id",
    "id",
    "productId",
    "sellerId",
    "affiliateId",
    "campaignId",
    "clickId",
    "campaignClickId",
    1,
    "total",
    "total",
    "commissionValue",
    "commissionType",
    "affiliateAmount",
    "platformCommissionValue",
    "platformCommissionType",
    "platformAmount",
    "sellerAmount",
    "createdAt",
    "updatedAt"
FROM "Order";

ALTER TABLE "Commission" ADD COLUMN "orderItemId" TEXT;

UPDATE "Commission"
SET "orderItemId" = 'item_' || "orderId"
WHERE "orderItemId" IS NULL;

DROP INDEX IF EXISTS "Commission_orderId_key";
DROP INDEX IF EXISTS "Settlement_orderId_key";

CREATE UNIQUE INDEX "Commission_orderItemId_key" ON "Commission"("orderItemId");
CREATE INDEX "Commission_orderId_idx" ON "Commission"("orderId");
CREATE INDEX "Settlement_orderId_idx" ON "Settlement"("orderId");
CREATE UNIQUE INDEX "Settlement_orderId_sellerId_key" ON "Settlement"("orderId", "sellerId");

CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderItem_sellerId_idx" ON "OrderItem"("sellerId");
CREATE INDEX "OrderItem_affiliateId_idx" ON "OrderItem"("affiliateId");
CREATE INDEX "OrderItem_campaignId_idx" ON "OrderItem"("campaignId");
CREATE INDEX "OrderItem_clickId_idx" ON "OrderItem"("clickId");
CREATE INDEX "OrderItem_campaignClickId_idx" ON "OrderItem"("campaignClickId");
CREATE INDEX "OrderItem_sellerId_createdAt_idx" ON "OrderItem"("sellerId", "createdAt");
CREATE INDEX "OrderItem_affiliateId_createdAt_idx" ON "OrderItem"("affiliateId", "createdAt");

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_clickId_fkey" FOREIGN KEY ("clickId") REFERENCES "Click"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_campaignClickId_fkey" FOREIGN KEY ("campaignClickId") REFERENCES "CampaignClick"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Commission" ADD CONSTRAINT "Commission_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
