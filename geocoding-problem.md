# The Geocoding Problem

Status as of 2026-08-04. All numbers refer to the self-hosted database
(`housing-db`, fresh import) unless noted. Dataset: 701,890 PPR property sales,
2014-01-02 → 2026-07-24.

## What we solved

### Eircode coverage
- **Exact eircode: 41.0% (287,621 rows)** — better than production's 33.8%.
  Achieved by exact address matching in `populate-eircodes.ts` (+44,911 rows on
  top of what PPR already supplies).
- **Exact *or* estimated eircode: 64.2%** (vs 63.9% production). Estimated
  eircodes come from routing-key heuristics (`estimateRoutingKey` +
  `routingKeyCoordinates` in `packages/ingestion/src/lib/eircode-heuristics.ts`).

### Coordinate coverage
- **Exact coordinates: 29.3% (205,807 rows)**.
- **Any coordinates usable for the map: 93.5% (~450,296 rows)** — the map falls
  back to estimated-coordinate centroids for the rest.
- Coordinate recovery (`recover-coordinates.ts`): **193 address-mirror** +
  **410 eircode-mirror** rows recovered.

### Geocoding infrastructure
- Local Nominatim (`housing-nominatim`, Ireland OSM extract) is fast:
  ~9 ms on cache hit, ~74 ms for 10 concurrent cold queries.
- Structured-query geocoding added as the primary path — `street` + `city` +
  `county` + `countrycodes=ie` + `layer=address`, plus `viewbox`/`bounded` per
  county. This replaces the old free-form `q=`-only approach as the documented,
  more deterministic strategy (Nominatim 5.3.2 search docs).
- A re-geocoding job (`regeocode.ts`) processes every row missing coordinates:
  LRU cache (150k), 25 concurrent requests, keyset pagination, and a free-form
  `q=` fallback.

## Gaps (as of 2026-08-04)

| Gap | Size | Why it's stuck |
|-----|------|----------------|
| Rows with eircode but **no coordinates** | **194,070** | Needs actual address→point geocoding (this is the current `regeocode.ts` target) |
| Rows with coordinates but **no eircode** | **126,150** | Spatial eircode recovery requires a seeded `VerifiedEircodeMap`, which needs the licensed dataset |
| Eircode mirroring | exhausted (only 410 recoverable) | Eircodes are ~unique, so "copy coords from another row with the same eircode" can't help |
| Centroid fallback | 0 rows | `internal_geo_reference` is empty — nothing to fall back to |
| `VerifiedEircodeMap` | 0 rows (empty) | Table + geom/GIST index exist (created by `20260512_create_verified_eircode_map` / `_fix_` migrations, also `CREATE TABLE IF NOT EXISTS` in code) but was never seeded |

### The map of what data each row can have

```
              +---- has eircode ----+      +-- has coords --+
  701,890     |   287,621 exact     |      |   205,807 exact |
   rows       |    +~163k estimated |      |   ~244k est.    |
              |                     |      |                 |
              194,070 w/ eircode, no coords  → regeocode.ts
              126,150 w/ coords, no eircode  → blocked (needs paid data)
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
6. **Coordinate mirroring** (`recover-coordinates.ts`, eircode-mirror path):
   only 410 recoverable because eircodes are effectively unique per row.
7. **Centroid fallback** (county/town centroid): 0 rows — the reference data it
   would fall back to is empty, so it is effectively dead code.

## In progress / next steps

- **`regeocode.ts`** — structured re-geocoding of the 194,070 rows missing
  coordinates. Level 1: structured `street/city/county/countrycodes/layer`,
  scoped by county `viewbox`+`bounded`; Level 2: free-form `q=` fallback.
  Tool image (`housing-tool`) already rebuilt on the server; job not yet run.
  Expected to lift the 29.3% exact-coordinate rate.
- **Re-run `ingest:enrich`** after re-geocoding, so address matching can recover
  more eircodes from newly obtained coordinates.
- **Routing-key expansion (deferred)** — build a locality→routing-key map from
  the 287,621 exact-eircode rows to improve estimated-eircode coverage from
  64% → an estimated 85–90%. All 139 routing keys are covered by existing data.

## Key files

- `packages/ingestion/src/jobs/regeocode.ts` — structured re-geocoder (new)
- `packages/ingestion/src/modules/ppr-import.ts` — import-time geocoding
  (`fetchCoordinates`), now structured-first
- `packages/ingestion/src/jobs/populate-eircodes.ts` — exact address-match
  eircode enrichment + `VerifiedEircodeMap` spatial fallback
- `packages/ingestion/src/jobs/recover-coordinates.ts` — coordinate mirroring /
  centroid fallback
- `packages/ingestion/src/lib/eircode-heuristics.ts` — routing-key estimation
- `packages/db/prisma/migrations/20260512_create_verified_eircode_map/` and
  `20260512_fix_verified_eircode_map/` — `VerifiedEircodeMap` table + geom/GIST
