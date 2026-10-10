-- AlterTable
ALTER TABLE "Click" ADD COLUMN     "sessionId" VARCHAR(36);

-- AlterTable
ALTER TABLE "CampaignClick" ADD COLUMN     "sessionId" VARCHAR(36);

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "checkoutKey" VARCHAR(64),
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "preferenceId" VARCHAR(191),
ADD COLUMN     "sessionId" VARCHAR(36);

-- CreateTable
CREATE TABLE "PaymentAttempt" (
    "id" VARCHAR(36) NOT NULL,
    "orderId" TEXT NOT NULL,
    "status" VARCHAR(50) NOT NULL DEFAULT 'ready',
    "method" VARCHAR(50),
    "requestHash" VARCHAR(64),
    "paymentId" VARCHAR(191),
    "statusDetail" VARCHAR(100),
    "startedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseEvent" (
    "id" TEXT NOT NULL,
    "eventKey" VARCHAR(191) NOT NULL,
    "name" VARCHAR(50) NOT NULL,
    "sessionId" VARCHAR(36),
    "productId" TEXT,
    "orderId" TEXT,
    "device" VARCHAR(20) NOT NULL DEFAULT 'unknown',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAttempt_paymentId_key" ON "PaymentAttempt"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseEvent_eventKey_key" ON "PurchaseEvent"("eventKey");

-- CreateIndex
CREATE INDEX "PurchaseEvent_createdAt_name_idx" ON "PurchaseEvent"("createdAt", "name");

-- CreateIndex
CREATE INDEX "PurchaseEvent_sessionId_productId_name_idx" ON "PurchaseEvent"("sessionId", "productId", "name");

-- CreateIndex
CREATE INDEX "PurchaseEvent_orderId_idx" ON "PurchaseEvent"("orderId");

-- CreateIndex
CREATE INDEX "Click_sessionId_createdAt_idx" ON "Click"("sessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CampaignClick_sessionId_createdAt_idx" ON "CampaignClick"("sessionId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Order_checkoutKey_key" ON "Order"("checkoutKey");

-- CreateIndex
CREATE INDEX "Order_sessionId_createdAt_idx" ON "Order"("sessionId", "createdAt");

-- AddForeignKey
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseEvent" ADD CONSTRAINT "PurchaseEvent_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
