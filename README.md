# Ireland Housing Explorer

A comprehensive web application for exploring the Irish housing market by comparing historical Central Statistics Office (CSO) data with current property listings and the full Property Price Register (PPR).

## Features

- **Interactive Market Map**: Explore 750,000+ historical transactions with high-precision PostGIS spatial indexing.
- **Self-Healing Ingestion**: An automated pipeline that auto-provisions PostGIS, creates required tables, and expands address abbreviations for better geocoding.
- **Intelligent Estimation**: Uses routing-key heuristics to provide estimated coordinates when exact geocoding is unavailable.
- **Official Metrics**: Real-time comparison with CSO Residential Property Price Index (RPPI) data.
- **Premium UI**: Dark-mode optimized, glassmorphic dashboard with real-time market inflation charts.

## Quick Start (Ingestion)

The easiest way to populate the database is using the provided PowerShell runner:

```powershell
# Full backfill from 2010 to present (Cleaning and Normalizing)
.\ingest.ps1 -Since 2010 -Truncate

# Quick sync of the latest month
.\ingest.ps1 -Sync

# Run spatial matching and coordinate recovery only
.\ingest.ps1 -EnrichOnly
```

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Recharts, OpenLayers.
- **Data Layer**: Prisma ORM with **PostGIS** spatial extensions.
- **Testing**: Jest (web), Vitest (packages). 143 total tests.
- **Ingestion**: Node.js/TSX workers with `p-limit` concurrency management.
- **Geocoding**: Local Nominatim (Docker) integration for high-volume processing.

## Architecture

- **Streaming Rendering**: Pages use React Suspense boundaries for progressive content delivery. ISR caching at 1-hour intervals.
- **Database Indexing**: PropertySale indexed on `county`, `saleDate`, `eircode`, `address`, and `descriptionOfProperty`.
- **Monorepo**: Powered by `pnpm` and `turbo` for clean boundary management between `@housing/db`, `@housing/ingestion`, `@housing/shared`, and `apps/web`.

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
