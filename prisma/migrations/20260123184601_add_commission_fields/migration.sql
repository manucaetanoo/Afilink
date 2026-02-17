-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "commissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT',
ADD COLUMN     "commissionValue" INTEGER NOT NULL DEFAULT 5;
