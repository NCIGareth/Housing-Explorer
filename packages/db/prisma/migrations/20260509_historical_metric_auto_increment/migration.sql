-- Migrate HistoricalMetric id from cuid string to auto-increment integer
-- Saves ~25-30 MB by replacing the long composite string PK with a 4-byte int.
-- The unique constraint on (source, metric, geography, period) replaces the old
-- custom-id deduplication logic.

-- 1. Create a sequence for the new integer id
CREATE SEQUENCE "HistoricalMetric_id_seq";

-- 2. Add the new integer column with default from the sequence
ALTER TABLE "HistoricalMetric" ADD COLUMN "new_id" INTEGER DEFAULT nextval('"HistoricalMetric_id_seq"');
ALTER SEQUENCE "HistoricalMetric_id_seq" OWNED BY "HistoricalMetric"."new_id";

-- 3. Backfill existing rows
UPDATE "HistoricalMetric" SET "new_id" = nextval('"HistoricalMetric_id_seq"');

-- 4. Drop old primary key and old id column
ALTER TABLE "HistoricalMetric" DROP CONSTRAINT "HistoricalMetric_pkey";
ALTER TABLE "HistoricalMetric" DROP COLUMN "id";

-- 5. Rename new column to id and set as primary key
ALTER TABLE "HistoricalMetric" RENAME COLUMN "new_id" TO "id";
ALTER TABLE "HistoricalMetric" ADD PRIMARY KEY ("id");

-- 6. Add unique constraint matching the @@unique([source, metric, geography, period])
ALTER TABLE "HistoricalMetric" ADD CONSTRAINT "HistoricalMetric_source_metric_geography_period_key"
  UNIQUE ("source", "metric", "geography", "period");

-- 7. Drop redundant indexes saving ~50 MB
DROP INDEX IF EXISTS "PropertySale_address_idx";
DROP INDEX IF EXISTS "PropertySale_descriptionOfProperty_idx";
DROP INDEX IF EXISTS "HistoricalMetric_metric_idx";
