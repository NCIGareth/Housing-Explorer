CREATE TABLE "PropertySale" (
  "id" TEXT NOT NULL,
  "sourceKey" TEXT NOT NULL,
  "saleDate" TIMESTAMP(3) NOT NULL,
  "address" TEXT NOT NULL,
  "county" TEXT NOT NULL,
  "eircode" TEXT,
  "priceEur" INTEGER NOT NULL,
  "notFullMarketPrice" BOOLEAN NOT NULL,
  "vatExclusive" BOOLEAN NOT NULL,
  "descriptionOfProperty" TEXT NOT NULL,
  "propertySizeDescription" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PropertySale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PropertySale_sourceKey_key" ON "PropertySale"("sourceKey");
CREATE INDEX "PropertySale_county_saleDate_idx" ON "PropertySale"("county", "saleDate");
CREATE INDEX "PropertySale_saleDate_priceEur_idx" ON "PropertySale"("saleDate", "priceEur");
