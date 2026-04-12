-- CreateEnum
CREATE TYPE "PayoutMethod" AS ENUM ('BANK_TRANSFER', 'MERCADO_PAGO', 'MANUAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bankAccountAlias" VARCHAR(120),
ADD COLUMN     "bankAccountNumber" VARCHAR(80),
ADD COLUMN     "bankAccountType" VARCHAR(30),
ADD COLUMN     "bankBranch" VARCHAR(120),
ADD COLUMN     "bankName" VARCHAR(120),
ADD COLUMN     "payoutCountry" VARCHAR(2),
ADD COLUMN     "payoutCurrency" VARCHAR(10),
ADD COLUMN     "payoutDocumentNumber" VARCHAR(40),
ADD COLUMN     "payoutDocumentType" VARCHAR(30),
ADD COLUMN     "payoutEmail" VARCHAR(191),
ADD COLUMN     "payoutHolderName" VARCHAR(120),
ADD COLUMN     "payoutMethod" "PayoutMethod" DEFAULT 'BANK_TRANSFER',
ADD COLUMN     "payoutNotes" TEXT,
ADD COLUMN     "payoutPhone" VARCHAR(40);
