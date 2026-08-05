-- Add geocode confidence columns to PropertySale
ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "coordinateConfidence" DOUBLE PRECISION;
ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "coordinateErrorMeters" INTEGER;

CREATE INDEX IF NOT EXISTS "PropertySale_coordinateConfidence_idx" ON "PropertySale" ("coordinateConfidence");
