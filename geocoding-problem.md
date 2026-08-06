# The Geocoding Problem

Status as of 2026-08-06. All numbers refer to the self-hosted database
(`housing-db`) unless noted. Dataset: 701,890 PPR property sales,
2014-01-02 → 2026-07-24.

## What we solved

### Eircode coverage
- **Exact eircode: 41.9% (293,861 rows)** — better than production's 33.8%.
  Achieved by exact address matching in `populate-eircodes.ts` (+44,911 rows on
  top of what PPR already supplies) plus a later spatial re-match after the
  re-geocode pass (+6,240 eircodes).
- **Exact *or* estimated eircode: 96.1% (674,434 rows)**. Estimated eircodes
  come from routing-key heuristics (`estimateRoutingKey` +
  `routingKeyCoordinates` in `packages/ingestion/src/lib/eircode-heuristics.ts`),
  now data-driven (see "Routing-key expansion" below).

### Coordinate coverage
- **Exact coordinates: 64.7% (454,175 rows)** — up from 29.3% thanks to the
  re-geocode pass (248,072 rows geocoded).
- **Any coordinates usable for the map: 96.1% (674,363 rows)** — the map falls
  back to estimated-coordinate routing-key centroids for the rest.
- Coordinate recovery (`recover-coordinates.ts`): **11 address-mirror** +
  **273 eircode-mirror** rows recovered.

### Coordinate confidence
- Every row now carries `coordinateConfidence` (0–100) + `coordinateErrorMeters`
  (`packages/ingestion/src/lib/geocode-confidence.ts`): exact geocodes score
  100 (±50 m); vague addresses ("Site at", "Lands at", …) score 85 (±200 m);
  estimated-only rows score piecewise from their routing key's measured mean
  error. Distribution: 453,086 @100 · 52,538 @50–99 · 181,517 @1–49 · 14,749 null.
  ~26% of rows (184,456) carry an error radius > 5 km — worst in rural routing
  keys (H71 Leitrim is only 20.3% exact-coord).
- Known gap (2026-08-06): 1,357 rows have coords but NULL confidence (written
  by the mirror/recovery job after the backfill) — re-run
  `ppr:confidence:backfill` to mop up; 1,089 exact-coord rows score <100.

### Geocoding infrastructure
- Local Nominatim (`housing-nominatim`, Ireland OSM extract) is fast:
  ~9 ms on cache hit, ~74 ms for 10 concurrent cold queries.
- Structured-query geocoding is the primary path — `street` + `city` +
  `county` + `countrycodes=ie` + `layer=address`, plus `viewbox`/`bounded` per
  county. Shared by the import path and the re-geocoder via
  `packages/ingestion/src/lib/geocode.ts` (single 4-level cascade + LRU cache).
- A re-geocoding job (`regeocode.ts`) processes every row missing coordinates:
  LRU cache (150k), 25 concurrent requests, keyset pagination, and a free-form
  `q=` fallback.

## Routing-key expansion (done)

The old `eircode-heuristics.ts` hardcoded **32 towns**. The new data-driven
generator (`packages/ingestion/src/scripts/generate-routing-keys.ts`) derives
everything from the ground-truth DB:

- **248 routing-key centroids** (averaged from rows with exact eircode + coords)
  vs the previous 139-key static list.
- **6,124 locality → routing-key entries across 26 counties**, mined from the
  293,861 exact-eircode rows (last non-county address token, per-county
  dominant-routing-key with ≥ 60% share and ≥ 2 rows; street-suffixed tokens
  excluded; county-name towns like "Cork"/"Limerick" recovered via a fallback).
- `estimateRoutingKey` now scans comma tokens (last → first) against the
  per-county map, strips trailing qualifiers ("Cork City" → "Cork"), and keeps
  Dublin postal-district handling.
- Backfill (`packages/ingestion/src/scripts/backfill-estimates.ts`) ran as a
  detached container on the server: **251,153 rows processed, 224,138 updated
  (89% hit rate)**, lifting estimated-coordinate/eircode coverage from 64.2% →
  96.1%. `VACUUM ANALYZE` ran after.

## Gaps (as of 2026-08-06)

| Gap | Size | Why it's stuck |
|-----|------|----------------|
| Rows with **no coordinates at all** (exact or estimated) | **13,392 (1.9%)** | Mostly apartment/estate complexes where the town is buried mid-token (e.g. "Apartment 204, Pier Head, Allins Quay Youghal"); no Nominatim match, no routing-key token |
| Rows with coordinates but **no exact eircode** | ~380k | Spatial eircode recovery requires a seeded `VerifiedEircodeMap`, which needs the licensed dataset |
| Exact eircode coverage ceiling | 41.9% | ECAF/ECAD (2.2M points) is paid/proprietary — the only way past this |
| `VerifiedEircodeMap` | 0 rows (empty) | Table + geom/GIST index exist but was never seeded |

### The map of what data each row can have

```
              +---- has eircode ----+      +-- has coords --+
  701,890     |   293,861 exact     |      |   454,175 exact |
   rows       |   +380,618 est.     |      |   234,323 est.  |
              |                     |      |                 |
              |    27,411 none      |      |    13,392 none  |
```

## What we tried and failed at

1. **Free eircode dataset on GitHub — `hmleal/irish-eircode-dataset` (MIT)**:
   placeholder. `dataset/dataset.csv` is 55 bytes, header only
   (`eircode,first_line,second_line,city,county,address_type`), README links
   broken. No rows, no coordinates.
2. **Hugging Face / Kaggle searches**: no free full eircode dataset exists.
3. **Official ECAF / ECAD (2.2M points with coordinates)**: paid / proprietary
   licence. This is what seeded production's `VerifiedEircodeMap`; it is not in
   the repo and cannot be re-purchased into the self-hosted stack without
   buying it.
4. **Nominatim `postalcode=` / postcode lookups**: consistently failed.
   Nominatim only computes postcode centroids from OSM data it imports; an
   external `ie_postcodes.csv` can be loaded *before* import to provide them,
   but we have neither the file nor a re-import, so postcode lookups have
   nothing to match.
5. **Free-form `q=` geocoding** (the original `ppr-import.ts` approach):
   order-dependent and unreliable — "123 Main St, Town, Co. Cork" matching
   depends on token order and often returns the wrong settlement or nothing.
6. **`layer=address` on everything**: matches street addresses only, not
   townlands — the first re-geocode attempt recovered ~0%.
7. **Coordinate mirroring** (`recover-coordinates.ts`, eircode-mirror path):
   only 273 recoverable because eircodes are effectively unique per row.
8. **Centroid fallback** (county/town centroid): 0 rows — the reference data it
   would fall back to is empty, so it is effectively dead code.

## Key files

- `packages/ingestion/src/lib/geocode.ts` — shared 4-level geocode cascade
  (L1 structured `street/city/county` + `layer=address`; L2 free-form full
  address; L3 first-part + county — the rural-townland winner; L4 bare first
  part, all county-`viewbox`-bounded) + LRU cache + throttle
- `packages/ingestion/src/jobs/regeocode.ts` — re-geocoder (completed:
  496,071 processed, 248,072 geocoded)
- `packages/ingestion/src/scripts/generate-routing-keys.ts` — data-driven
  routing-key centroid + locality map generator
- `packages/ingestion/src/scripts/backfill-estimates.ts` — batched backfill of
  `estimatedEircode`/`estimatedLatitude`/`estimatedLongitude` (keyset
  pagination, transactional batches)
- `packages/ingestion/src/modules/ppr-import.ts` — import-time geocoding
  (`fetchCoordinates`), now structured-first via `geocode.ts`
- `packages/ingestion/src/jobs/populate-eircodes.ts` — exact address-match
  eircode enrichment + `VerifiedEircodeMap` spatial fallback
- `packages/ingestion/src/lib/eircode-heuristics.ts` — generated routing-key
  estimation (248 centroids, 6,124 localities, `estimateRoutingKey`)
- `scripts/regeocode.ps1` — server job launcher/monitor (start/logs/stop)
- `packages/db/prisma/migrations/20260512_create_verified_eircode_map/` and
  `20260512_fix_verified_eircode_map/` — `VerifiedEircodeMap` table + geom/GIST
