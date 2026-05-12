-- Create MedianPriceCache table for pre-computed monthly median prices
-- This avoids expensive percentile_cont(0.5) queries on every dashboard load

CREATE TABLE IF NOT EXISTS "MedianPriceCache" (
    id SERIAL PRIMARY KEY,
    county TEXT NOT NULL,
    period VARCHAR(7) NOT NULL,
    value DOUBLE PRECISION NOT NULL,
    "saleCount" INTEGER NOT NULL DEFAULT 0,
    "refreshedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "MedianPriceCache_county_period_key" UNIQUE (county, period)
);

CREATE INDEX IF NOT EXISTS "MedianPriceCache_county_idx" ON "MedianPriceCache" (county);
