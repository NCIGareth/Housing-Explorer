-- Add the geometry column and GIST index to VerifiedEircodeMap
-- These were declared in the Prisma schema but never created in a migration.
-- The column uses PostGIS geometry type for spatial queries.

ALTER TABLE "VerifiedEircodeMap" ADD COLUMN IF NOT EXISTS geom geometry(Point, 4326);
CREATE INDEX IF NOT EXISTS verified_eircode_geom_idx ON "VerifiedEircodeMap" USING GIST (geom);
