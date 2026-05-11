-- Add coordinate and geocoding columns to PropertySale
-- These columns exist in the Prisma schema but were never captured in a migration

ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;
ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "estimatedEircode" TEXT;
ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "estimatedLatitude" DOUBLE PRECISION;
ALTER TABLE "PropertySale" ADD COLUMN IF NOT EXISTS "estimatedLongitude" DOUBLE PRECISION;
