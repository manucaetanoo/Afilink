CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELED');

ALTER TABLE "Settlement"
  ADD COLUMN "fulfillmentStatus" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "shippingCarrier" VARCHAR(80),
  ADD COLUMN "trackingCode" VARCHAR(120),
  ADD COLUMN "trackingUrl" VARCHAR(300),
  ADD COLUMN "shippedAt" TIMESTAMP(3),
  ADD COLUMN "deliveredAt" TIMESTAMP(3),
  ADD COLUMN "sellerNotes" TEXT;

CREATE INDEX "Settlement_fulfillmentStatus_idx" ON "Settlement"("fulfillmentStatus");
