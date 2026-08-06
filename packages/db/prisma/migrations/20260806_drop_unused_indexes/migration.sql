-- Drop PropertySale indexes Postgres never uses (verified via
-- pg_stat_user_indexes on the live DB, 2026-08-06):
--
--   - PropertySale_address_btree_idx (62 MB, 16 scans) — leading-wildcard
--     address search is served by the trigram GIN (address_trgm_idx); a btree
--     on address only helps equality/range which the app never runs.
--   - PropertySale_descriptionOfProperty_idx (16 MB, 10 scans) — the column
--     has only two distinct values, so the planner always seq-scans.
--   - PropertySale_isApartment_idx (9 MB, 1 scan) — a boolean at ~6% or ~94%
--     selectivity is never worth a btree; the column alone avoids the regex
--     scan at query time, the index does not.
--
-- Combined ~87 MB reclaimed and less write amplification on PPR upserts.
DROP INDEX IF EXISTS "PropertySale_address_btree_idx";
DROP INDEX IF EXISTS "PropertySale_descriptionOfProperty_idx";
DROP INDEX IF EXISTS "PropertySale_isApartment_idx";
