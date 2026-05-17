CREATE TABLE "ShopifyConnection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "shopDomain" VARCHAR(191) NOT NULL,
    "accessToken" TEXT NOT NULL,
    "scope" TEXT,
    "installedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ShopifyConnection_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ShopifyConnection_userId_key" ON "ShopifyConnection"("userId");
CREATE UNIQUE INDEX "ShopifyConnection_shopDomain_key" ON "ShopifyConnection"("shopDomain");
CREATE INDEX "ShopifyConnection_shopDomain_idx" ON "ShopifyConnection"("shopDomain");

ALTER TABLE "ShopifyConnection" ADD CONSTRAINT "ShopifyConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
