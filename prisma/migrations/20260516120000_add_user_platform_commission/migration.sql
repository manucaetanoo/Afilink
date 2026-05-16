ALTER TABLE "User" ADD COLUMN "platformCommissionValue" INTEGER NOT NULL DEFAULT 5;
ALTER TABLE "User" ADD COLUMN "platformCommissionType" "CommissionType" NOT NULL DEFAULT 'PERCENT';
