-- AlterTable
ALTER TABLE "ListingCurrent" ADD COLUMN     "eircode" TEXT;

-- CreateIndex
CREATE INDEX "ListingCurrent_county_askingPriceEur_beds_isActive_idx" ON "ListingCurrent"("county", "askingPriceEur", "beds", "isActive");
