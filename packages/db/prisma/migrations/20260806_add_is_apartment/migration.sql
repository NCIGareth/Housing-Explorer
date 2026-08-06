-- Add isApartment flag: true when the address matches apartment/flat markers
-- (see packages/ingestion/src/lib/housing-type.ts for the regex), null = not yet classified.
ALTER TABLE "PropertySale" ADD COLUMN "isApartment" BOOLEAN;

CREATE INDEX "PropertySale_isApartment_idx" ON "PropertySale"("isApartment");
