-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "campaignClickId" TEXT,
ADD COLUMN     "campaignId" TEXT;

-- CreateTable
CREATE TABLE "AffiliateCampaignLink" (
    "id" TEXT NOT NULL,
    "code" VARCHAR(120) NOT NULL,
    "campaignId" TEXT NOT NULL,
    "affiliateId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AffiliateCampaignLink_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignClick" (
    "id" TEXT NOT NULL,
    "linkId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ip" VARCHAR(64),
    "userAgent" TEXT,

    CONSTRAINT "CampaignClick_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCampaignLink_code_key" ON "AffiliateCampaignLink"("code");

-- CreateIndex
CREATE INDEX "AffiliateCampaignLink_affiliateId_idx" ON "AffiliateCampaignLink"("affiliateId");

-- CreateIndex
CREATE INDEX "AffiliateCampaignLink_campaignId_idx" ON "AffiliateCampaignLink"("campaignId");

-- CreateIndex
CREATE UNIQUE INDEX "AffiliateCampaignLink_campaignId_affiliateId_key" ON "AffiliateCampaignLink"("campaignId", "affiliateId");

-- CreateIndex
CREATE INDEX "CampaignClick_linkId_idx" ON "CampaignClick"("linkId");

-- CreateIndex
CREATE INDEX "CampaignClick_createdAt_idx" ON "CampaignClick"("createdAt");

-- CreateIndex
CREATE INDEX "Order_campaignId_idx" ON "Order"("campaignId");

-- CreateIndex
CREATE INDEX "Order_campaignClickId_idx" ON "Order"("campaignClickId");

-- AddForeignKey
ALTER TABLE "AffiliateCampaignLink" ADD CONSTRAINT "AffiliateCampaignLink_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AffiliateCampaignLink" ADD CONSTRAINT "AffiliateCampaignLink_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignClick" ADD CONSTRAINT "CampaignClick_linkId_fkey" FOREIGN KEY ("linkId") REFERENCES "AffiliateCampaignLink"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_campaignClickId_fkey" FOREIGN KEY ("campaignClickId") REFERENCES "CampaignClick"("id") ON DELETE SET NULL ON UPDATE CASCADE;
