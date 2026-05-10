-- Enable pg_trgm extension for trigram-based ILIKE search
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN index on address for leading-wildcard ILIKE queries (searchProperties)
CREATE INDEX IF NOT EXISTS "PropertySale_address_trgm_idx" ON "PropertySale" USING GIN ("address" gin_trgm_ops);
