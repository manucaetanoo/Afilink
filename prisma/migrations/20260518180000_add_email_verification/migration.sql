ALTER TABLE "User"
  ADD COLUMN "emailVerifiedAt" TIMESTAMP(3);

UPDATE "User"
SET "emailVerifiedAt" = COALESCE("createdAt", NOW())
WHERE "emailVerifiedAt" IS NULL;

CREATE TABLE "EmailVerificationToken" (
  "id" TEXT NOT NULL,
  "tokenHash" VARCHAR(191) NOT NULL,
  "userId" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "usedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EmailVerificationToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EmailVerificationToken_tokenHash_key"
  ON "EmailVerificationToken"("tokenHash");

CREATE INDEX "EmailVerificationToken_userId_idx"
  ON "EmailVerificationToken"("userId");

CREATE INDEX "EmailVerificationToken_expiresAt_idx"
  ON "EmailVerificationToken"("expiresAt");

ALTER TABLE "EmailVerificationToken"
  ADD CONSTRAINT "EmailVerificationToken_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
