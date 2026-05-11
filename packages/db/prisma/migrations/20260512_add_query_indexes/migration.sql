-- Add missing indexes for common query patterns

-- 1. Trigram index on eircode ILIKE leading-wildcard queries
-- Used by searchProperties() in apps/web/lib/queries.ts
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PropertySale_eircode_trgm_idx" ON "PropertySale" USING GIN (eircode gin_trgm_ops);
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PropertySale_estimated_eircode_trgm_idx" ON "PropertySale" USING GIN ("estimatedEircode" gin_trgm_ops);

-- 2. Expression index on eircode routing key (first 3 chars)
-- Used by getEircodeRoutingKeyStats() and getSingleEircodeRoutingKeyStats()
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PropertySale_routing_key_idx" ON "PropertySale" (SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3));

-- 3. B-tree index on descriptionOfProperty for GROUP BY queries
-- Used by getPropertyTypes()
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PropertySale_descriptionOfProperty_idx" ON "PropertySale" ("descriptionOfProperty");

-- 4. B-tree index on address for GROUP BY queries
-- Used by getLocalities()
CREATE INDEX CONCURRENTLY IF NOT EXISTS "PropertySale_address_btree_idx" ON "PropertySale" ("address");

-- 5. Index on FavouriteProperty.propertyId for "who favourited this property" queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS "FavouriteProperty_propertyId_idx" ON "FavouriteProperty" ("propertyId");

-- 6. Drop redundant single-column saleDate index (already covered by PropertySale_saleDate_priceEur_idx leftmost prefix)
DROP INDEX IF EXISTS "PropertySale_saleDate_idx";
