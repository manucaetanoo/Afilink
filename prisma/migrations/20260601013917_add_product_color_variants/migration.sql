/*
  Warnings:

  - You are about to drop the column `colorHex` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the column `colorName` on the `Product` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "OrderItem" ADD COLUMN     "selectedColor" VARCHAR(40);

-- AlterTable
ALTER TABLE "Product" DROP COLUMN "colorHex",
DROP COLUMN "colorName",
ADD COLUMN     "colors" JSONB;
