CREATE TYPE "PayoutRequestKind" AS ENUM ('SELLER', 'AFFILIATE');
CREATE TYPE "PayoutRequestStatus" AS ENUM ('PENDING', 'PAID', 'CANCELED');

CREATE TABLE "PayoutRequest" (
  "id" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "kind" "PayoutRequestKind" NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" "PayoutRequestStatus" NOT NULL DEFAULT 'PENDING',
  "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "paidAt" TIMESTAMP(3),
  "adminNotes" TEXT,

  CONSTRAINT "PayoutRequest_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PayoutRequest_requesterId_idx" ON "PayoutRequest"("requesterId");
CREATE INDEX "PayoutRequest_kind_idx" ON "PayoutRequest"("kind");
CREATE INDEX "PayoutRequest_status_idx" ON "PayoutRequest"("status");
CREATE INDEX "PayoutRequest_requestedAt_idx" ON "PayoutRequest"("requestedAt");

ALTER TABLE "PayoutRequest"
  ADD CONSTRAINT "PayoutRequest_requesterId_fkey"
  FOREIGN KEY ("requesterId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
