# Ireland Housing Explorer

A comprehensive web application for exploring the Irish housing market by combining official Central Statistics Office (CSO) data with the full Property Price Register (PPR) — every residential sale filed for stamp duty since 2014.

## Features

- **Interactive Market Map**: Explore 701,890 historical transactions with four view modes: Points, Heatmap, Clusters, Areas. High-precision PostGIS spatial indexing.
- **Self-Healing Ingestion**: An automated pipeline that auto-provisions PostGIS, creates required tables, and expands address abbreviations for better geocoding.
- **Intelligent Estimation**: Uses data-driven routing-key heuristics to provide estimated coordinates and eircodes when exact geocoding is unavailable. Every row carries a coordinate confidence score (0–100) with an error radius, surfaced on the sale detail page and as dashed error-radius circles on the map.
- **Housing Type Filter**: Search filters distinguish apartments/flats from houses via a word-boundary address-token scan (42k+ of 701,890 rows flagged), with quick date-range presets (last 3/6/9/12 months).
- **Official Metrics**: CSO Residential Property Price Index (RPPI) and CSO crime statistics.
- **Area Comparison**: Compare price trends across areas in two modes — an official CSO index (counties only) or PPR quarterly median prices (counties **and** eircode routing keys, e.g. D20 vs the Dublin average).
- **User Accounts**: Email/password authentication via Supabase Auth. Sign up, sign in, profile management.
- **Alert Management**: Create saved searches with filters (county, price range) and get emailed monthly when new PPR sales match.
- **Saved Properties**: Bookmark individual property sales for later reference.
- **Data Export**: Download filtered property sale records as CSV (requires a logged-in account).
- **Similar Properties**: On each sale detail page, view other properties sold on the same street.

## Quick Start (Ingestion)

The easiest way to populate the database is using the provided PowerShell runner:

```powershell
# Full backfill from 2014 to present (Cleaning and Normalizing)
.\ingest.ps1 -Since 2014 -Truncate

# Quick sync of the latest month
.\ingest.ps1 -Sync

# Run spatial matching and coordinate recovery only
.\ingest.ps1 -EnrichOnly
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Recharts, OpenLayers.
- **Data Layer**: Prisma ORM with **PostGIS** spatial extensions, self-hosted on an Oracle ARM box via Docker Compose.
- **Auth**: Supabase Auth (email/password) with `@supabase/ssr` for session management.
- **Testing**: Jest (web), Vitest (packages), Playwright (E2E). 200 unit/integration tests + 7 E2E smoke tests.
- **Ingestion**: Node.js/TSX workers with `p-limit` concurrency management.
- **Geocoding**: Local Nominatim (Docker) integration for high-volume processing.

## Architecture

- **Streaming Rendering**: Pages use React Suspense boundaries for progressive content delivery. The home/search pages are server-rendered per request; sale detail pages use ISR with 1-hour revalidation.
- **Database Indexing**: PropertySale indexed on `county`+`saleDate`, `saleDate`+`priceEur`, `eircode`, and a trigram GIN index on `address` for leading-wildcard search.
- **Median Price Cache**: Pre-computed monthly median prices by county in a dedicated table, avoiding expensive `percentile_cont` queries on every dashboard load.
- **Coordinate Confidence**: Every row is scored (`geocode-confidence.ts`) with a confidence value and error radius; the score is stored in `coordinateConfidence` / `coordinateErrorMeters`.
- **Rate Limiting**: Upstash Redis-backed rate limits on API routes (falls back to in-memory in local dev).
- **Monorepo**: Powered by `pnpm` and `turbo` for clean boundary management between `@housing/db`, `@housing/ingestion`, `@housing/shared`, and `apps/web`.

## Deployment

Production runs on a self-hosted Oracle ARM server via `docker-compose.prod.yml` (Next.js app + PostGIS + Nominatim containers), served through Caddy. Supabase is used for auth only. The monthly alert dispatch and DB-size monitor run as cron jobs on the host hitting `localhost:3000` with an `x-cron-secret` header.

## Testing

```bash
# Run all tests across the monorepo
pnpm test

# Run web tests only
pnpm --filter @housing/web test

# Run package tests only
pnpm --filter @housing/shared test
pnpm --filter @housing/ingestion test
pnpm --filter @housing/db test
```

## Development

1. **Install dependencies**: `pnpm install`
2. **Start Nominatim**: `docker compose up -d`
3. **Set up .env**: Copy `.env.example` and ensure `DATABASE_URL` uses port `5432` for initial setup.
4. **Run Ingestion**: `.\ingest.ps1`
5. **Start Dev**: `pnpm dev`

---
