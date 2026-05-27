ALTER TABLE "Product"
ADD COLUMN "shopifyShopDomain" VARCHAR(191),
ADD COLUMN "shopifyProductId" VARCHAR(80),
ADD COLUMN "shopifyVariantId" VARCHAR(80),
ADD COLUMN "shopifyVariants" JSONB;

CREATE INDEX "Product_shopifyShopDomain_idx" ON "Product"("shopifyShopDomain");
CREATE INDEX "Product_shopifyVariantId_idx" ON "Product"("shopifyVariantId");
