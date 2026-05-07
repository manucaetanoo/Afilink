ALTER TABLE "Order"
ADD COLUMN "buyerName" VARCHAR(140),
ADD COLUMN "buyerEmail" VARCHAR(191),
ADD COLUMN "buyerPhone" VARCHAR(40),
ADD COLUMN "shippingStreet" VARCHAR(160),
ADD COLUMN "shippingNumber" VARCHAR(30),
ADD COLUMN "shippingApartment" VARCHAR(60),
ADD COLUMN "shippingCity" VARCHAR(120),
ADD COLUMN "shippingState" VARCHAR(120),
ADD COLUMN "shippingPostalCode" VARCHAR(20),
ADD COLUMN "shippingCountry" VARCHAR(2),
ADD COLUMN "shippingNotes" TEXT;
