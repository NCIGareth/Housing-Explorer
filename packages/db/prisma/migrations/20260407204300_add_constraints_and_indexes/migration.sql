-- Add check constraints for data integrity
ALTER TABLE "ListingCurrent"
  ADD CONSTRAINT "ListingCurrent_askingPriceEur_positive" CHECK ("askingPriceEur" > 0),
  ADD CONSTRAINT "ListingCurrent_beds_positive" CHECK ("beds" IS NULL OR "beds" > 0),
  ADD CONSTRAINT "ListingCurrent_baths_positive" CHECK ("baths" IS NULL OR "baths" > 0);

ALTER TABLE "PropertySale"
  ADD CONSTRAINT "PropertySale_priceEur_positive" CHECK ("priceEur" > 0),
  ADD CONSTRAINT "PropertySale_latitude_range" CHECK ("latitude" IS NULL OR ("latitude" >= -90 AND "latitude" <= 90)),
  ADD CONSTRAINT "PropertySale_longitude_range" CHECK ("longitude" IS NULL OR ("longitude" >= -180 AND "longitude" <= 180));

-- Add NOT NULL constraints where appropriate
ALTER TABLE "SavedSearch" ALTER COLUMN "userId" SET NOT NULL;
ALTER TABLE "Alert" ALTER COLUMN "userId" SET NOT NULL;

-- Add missing indexes for performance
CREATE INDEX "ListingCurrent_isActive_idx" ON "ListingCurrent"("isActive");
CREATE INDEX "ListingCurrent_listedAt_desc_idx" ON "ListingCurrent"("listedAt" DESC);
CREATE INDEX "PropertySale_saleDate_idx" ON "PropertySale"("saleDate");
CREATE INDEX "Alert_userId_enabled_idx" ON "Alert"("userId", "enabled");
CREATE INDEX "SavedSearch_userId_idx" ON "SavedSearch"("userId");

-- Remove redundant index (overlapping with the first one)
DROP INDEX IF EXISTS "ListingCurrent_county_askingPriceEur_beds_isActive_idx";