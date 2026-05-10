-- Add price tracking fields to ListingCurrent for alert dispatch
ALTER TABLE "ListingCurrent" ADD COLUMN "previousPriceEur" INTEGER;
ALTER TABLE "ListingCurrent" ADD COLUMN "priceUpdatedAt" TIMESTAMP(3);
