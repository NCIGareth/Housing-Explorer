-- Drop PropertySale_coordinateConfidence_idx (51 MB). Verified 2026-08-06:
--   - The web app never filters on coordinateConfidence — it only *projects* it
--     (sale detail + similar properties). No query-time predicate uses this index.
--   - Its only consumer is the one-time ppr:confidence:backfill job, which keysets
--     on `coordinateConfidence: null, id > cursor ORDER BY id`. With the btree
--     present the planner does a full-index scan per 500-row batch (204 scans,
--     139.9M idx_tup_read ≈ 685k rows/scan). Without it the planner uses the pkey
--     keyset path, which is O(batch) per batch — faster, not slower.
--   - A btree on a ~99.8%-not-null column can never help "IS NULL" efficiently.
DROP INDEX IF EXISTS "PropertySale_coordinateConfidence_idx";
