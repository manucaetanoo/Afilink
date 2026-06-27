DROP TABLE IF EXISTS "ShopifyBillingCharge";

ALTER TABLE "Order"
DROP COLUMN IF EXISTS "shopifyBillingStatus",
DROP COLUMN IF EXISTS "shopifyBillingUsageRecordId",
DROP COLUMN IF EXISTS "shopifyBillingError";
