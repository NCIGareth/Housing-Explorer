# The Vibecoding Ceiling

*…or "the complementary modern web development platform problem" — when Vercel +
Supabase can't hold the map.*

Status as of 2026-08-04.

## The premise that didn't survive contact with data

Vercel (serverless Next.js) + Supabase (hosted Postgres) is the default
"vibe-coded" stack: push to GitHub, everything auto-deploys, storage, auth,
edge functions, and a database you never have to babysit. Zero-ops, generous
free tiers, "startup speed". For CRUD apps it genuinely is great.

The Housing Explorer is *not* a CRUD app. It is a **data product**: 684,446
property sale records, geocoded addresses, monthly price analytics, and
map rendering. It needs a Postgres server that can run PostGIS, hold a
multi-hundred-megabyte OSM extract for geocoding, and answer spatial queries
fast. Every one of those needs is exactly what the complementary modern stack
is worst at — and all three walls hit at once.

## Wall #1 — We couldn't host Nominatim

Nominatim is the geocoder that turns a PPR address (`"12 Main St, Town,
Co. Cork"`) into lat/lon. It is not a library you can `npm install`. It is a
**long-running PostgreSQL server pre-loaded with the Ireland OSM extract**
(~2 GB+, needs GBs of RAM/disk and a days-long import).

- Vercel runs **ephemeral serverless functions** (seconds-long execution,
  no persistent disk, no Docker, no Postgres). A geocoder that has to ingest
  the OSM planet is impossible there.
- Supabase's managed Postgres is a black box — you cannot install Nominatim's
  schema *into* it, and you certainly can't run a second Postgres inside it.
- Result: the app had to call **someone else's geocoding API** over the
  network on every import — slow, rate-limited, and the PPR import (which
  geocodes tens of thousands of addresses) became the bottleneck. Mitigations
  (LRU cache, concurrency of 10) were band-aids over the fact that the
  infrastructure for the job was just not there.

## Wall #2 — We couldn't hold all the records *with* spatial indexing

- Free-tier Supabase gives **500 MB**. The project was already at
  **363 MB / 500 MB** with 684,446 sales.
- Real geospatial querying needs PostGIS — a `geom` column (point per row)
  **plus a GIST spatial index**. On 684k rows that's a large chunk of the
  remaining 137 MB. The `geom` column was dropped from the schema precisely
  because the budget didn't exist.
- To even fit: the retention window was cut to **13 years (2014–present)**,
  `HistoricalMetric` was shrunken (cuid → autoincrement int, saving 27 MB),
  and the monthly median price was pre-computed into a `MedianPriceCache`
  table instead of computed on demand — because `percentile_cont` over 684k
  rows was both slow and storage-hungry.
- Other managed-Postgres frictions: **VACUUM blocked through the pooler**,
  connection-pooler limits, and free projects that pause.

## Wall #3 — It was slow

- **Serverless cold starts** on every API hit; the site had to be "cache
  first, compute second" just to feel responsive.
- **Network geocoding** during import (see Wall #1) made a 700k-row import
  take an age.
- **Search on ILIKE** over hundreds of thousands of addresses needed a
  `pg_trgm` GIN index that was only added late as a mitigation.
- The whole performance story was *working around the platform's limits*
  instead of buying hardware that was never expensive in the first place.

## What we did about it

Moved the entire data layer to **Oracle Cloud Free Tier ARM (Ampere A1)** —
a box that is *free* and dramatically more capable:

| Capability | Old stack (Vercel + Supabase) | New stack (self-hosted ARM) |
|---|---|---|
| Geocoding | external network API, rate-limited | **local Nominatim**, ~9 ms / cache hit |
| Database | 500 MB ceiling (363 MB used) | **PostGIS on 500 MB of a 24 GB-RAM box** — 55 MB used (11%) |
| Spatial indexing | none (geom dropped) | **GIST + PostGIS available**, full freedom |
| Dataset | 684,446 rows, trimmed to 13 years | **701,890 rows, 2014–2026**, no pruning needed |
| Import pipeline | fights 10 s function timeouts | **long-running Docker job**, no timeout |
| Infrastructure | can't run Postgres/OSM services | **Docker Compose**: Next.js standalone + PostGIS + Nominatim |

Result: the user's own words — *"soo much faster."* The one thing the old
stack did fine — hosted Supabase auth — we kept: **Supabase is now auth-only**,
and everything else runs on the free ARM box behind Cloudflare → nginx → the
app container.

## Lessons

1. **The complementary modern web stack is a great on-ramp, not a destination
   for data products.** Its abstractions are the bottleneck the moment you need
   a Postgres server you control, PostGIS, or a long-running service like a
   geocoder.
2. **Vibecoding optimizes for *shipping*, not for *holding the map*.** The
   free tiers are sized for CRUD demos, and a 700k-row geospatial dataset is
   not a demo.
3. **The fix was embarrassingly cheap.** A free-tier ARM server with 24 GB RAM
   out-performed the "zero-ops" stack, because real hardware lets you stop
   working around limits.
4. **Keep what the platform is genuinely good at.** Supabase auth survived the
   migration; it was never the problem. The problem was asking a serverless
   platform to *be* a Postgres/OSM data center.

## Related

- `docker-compose.prod.yml` — the self-hosted stack (db, nominatim, app, jobs)
- `apps/web/Dockerfile` — Next.js `output: "standalone"` ARM64 build
- `apps/web/next.config.mjs` — standalone output + Prisma tracing includes
- `geocoding-problem.md` — the data-coverage problem that started all this
