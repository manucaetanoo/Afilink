CREATE INDEX IF NOT EXISTS "idx_product_active_commission_created"
ON "Product" ("isActive", "commissionValue", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_campaign_active_created"
ON "Campaign" ("isActive", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_campaign_active_window"
ON "Campaign" ("isActive", "startsAt", "endsAt");

CREATE INDEX IF NOT EXISTS "idx_settlement_seller_created"
ON "Settlement" ("sellerId", "createdAt");

CREATE INDEX IF NOT EXISTS "idx_settlement_seller_status_fulfillment"
ON "Settlement" ("sellerId", "status", "fulfillmentStatus");
