-- Migrate HistoricalMetric id from cuid string to auto-increment integer
-- Saves ~25-30 MB by replacing the long composite string PK with a 4-byte int.
-- The unique constraint on (source, metric, geography, period) replaces the old
-- custom-id deduplication logic.

-- 1. Create a sequence for the new integer id
CREATE SEQUENCE IF NOT EXISTS "HistoricalMetric_id_seq";

-- 2. Add the new integer column with default from the sequence
ALTER TABLE "HistoricalMetric" ADD COLUMN IF NOT EXISTS "new_id" INTEGER DEFAULT nextval('"HistoricalMetric_id_seq"');
ALTER SEQUENCE "HistoricalMetric_id_seq" OWNED BY "HistoricalMetric"."new_id";

-- 3. Backfill existing rows
UPDATE "HistoricalMetric" SET "new_id" = nextval('"HistoricalMetric_id_seq"') WHERE "new_id" IS NULL;

-- 4. Drop old primary key if it still exists and old id column
ALTER TABLE "HistoricalMetric" DROP CONSTRAINT IF EXISTS "HistoricalMetric_pkey";
ALTER TABLE "HistoricalMetric" DROP COLUMN IF EXISTS "id";

-- 5. Rename new column to id and set as primary key (only if not already renamed)
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'HistoricalMetric' AND column_name = 'new_id') THEN
    ALTER TABLE "HistoricalMetric" RENAME COLUMN "new_id" TO "id";
  END IF;
END $$;
ALTER TABLE "HistoricalMetric" ADD PRIMARY KEY ("id");

-- 6. Add unique constraint matching the @@unique([source, metric, geography, period]) if not already present
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'HistoricalMetric_source_metric_geography_period_key') THEN
    ALTER TABLE "HistoricalMetric" ADD CONSTRAINT "HistoricalMetric_source_metric_geography_period_key"
      UNIQUE ("source", "metric", "geography", "period");
  END IF;
END $$;

-- 7. Drop redundant indexes saving ~50 MB
DROP INDEX IF EXISTS "PropertySale_address_idx";
DROP INDEX IF EXISTS "PropertySale_descriptionOfProperty_idx";
DROP INDEX IF EXISTS "HistoricalMetric_metric_idx";
