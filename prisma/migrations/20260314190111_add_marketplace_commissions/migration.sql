/*
  Warnings:

  - Added the required column `commissionType` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `commissionValue` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformCommissionType` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `platformCommissionValue` to the `Order` table without a default value. This is not possible if the table is not empty.
  - Added the required column `sellerId` to the `Order` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'AVAILABLE', 'PAID', 'CANCELED');

-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "affiliateAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "affiliateId" TEXT,
ADD COLUMN     "commissionType" "CommissionType" NOT NULL,
ADD COLUMN     "commissionValue" INTEGER NOT NULL,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "paymentProvider" TEXT,
ADD COLUMN     "paymentStatus" TEXT,
ADD COLUMN     "platformAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "platformCommissionType" "CommissionType" NOT NULL,
ADD COLUMN     "platformCommissionValue" INTEGER NOT NULL,
ADD COLUMN     "sellerAmount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "sellerId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "platformCommissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "platformCommissionValue" INTEGER NOT NULL DEFAULT 5;

-- CreateTable
CREATE TABLE "Settlement" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "grossAmount" INTEGER NOT NULL,
    "platformFee" INTEGER NOT NULL,
    "affiliateFee" INTEGER NOT NULL,
    "netAmount" INTEGER NOT NULL,
    "status" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Settlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Settlement_orderId_key" ON "Settlement"("orderId");

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_affiliateId_fkey" FOREIGN KEY ("affiliateId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Settlement" ADD CONSTRAINT "Settlement_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
