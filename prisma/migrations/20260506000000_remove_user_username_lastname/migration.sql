-- DropIndex
DROP INDEX IF EXISTS "User_username_idx";

-- DropIndex
DROP INDEX IF EXISTS "User_username_key";

-- AlterTable
ALTER TABLE "User"
DROP COLUMN IF EXISTS "lastName",
DROP COLUMN IF EXISTS "username";
