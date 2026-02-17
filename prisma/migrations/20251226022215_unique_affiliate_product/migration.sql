/*
  Warnings:

  - A unique constraint covering the columns `[productId,affiliateId]` on the table `AffiliateLink` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "AffiliateLink_productId_affiliateId_key" ON "AffiliateLink"("productId", "affiliateId");
