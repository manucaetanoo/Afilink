ALTER TABLE "Product"
  ADD COLUMN "stock" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "Product_stock_idx" ON "Product"("stock");
