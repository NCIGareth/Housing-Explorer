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

- **Frontend**: Next.js 15 (App Router), Tailwind CSS v4, Recharts.
- **Data Layer**: Prisma ORM with **PostGIS** spatial extensions.
- **Ingestion**: Node.js/TSX workers with `p-limit` concurrency management.
- **Geocoding**: Local Nominatim (Docker) integration for high-volume processing.

## Architecture

- **Direct Connection Strategy**: All ingestion scripts connect to Supabase via port `5432` to ensure zero-latency schema visibility.
- **Monorepo**: Powered by `pnpm` and `turbo` for clean boundary management between `@housing/db`, `@housing/ingestion`, and `apps/web`.

## Development

1. **Install dependencies**: `pnpm install`
2. **Start Nominatim**: `docker compose up -d`
3. **Set up .env**: Copy `.env.example` and ensure `DATABASE_URL` uses port `5432` for initial setup.
4. **Run Ingestion**: `.\ingest.ps1`
5. **Start Dev**: `pnpm dev`

---
*Built with Antigravity by Google DeepMind.*
