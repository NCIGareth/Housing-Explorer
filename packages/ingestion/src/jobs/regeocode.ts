import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { logError, logInfo } from '../lib/logger';
import pLimit from 'p-limit';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const NOMINATIM_URL = process.env.NOMINATIM_URL || "http://localhost:8080";
const CONCURRENCY = Number(process.env.GEO_CONCURRENCY ?? 25);
const BATCH_SIZE = 2000;

class LRUMap<K, V> {
  private map = new Map<K, V>();
  constructor(private maxSize: number) {}
  get(key: K): V | undefined {
    const val = this.map.get(key);
    if (val !== undefined) {
      this.map.delete(key);
      this.map.set(key, val);
    }
    return val;
  }
  set(key: K, value: V): void {
    if (this.map.size >= this.maxSize) {
      const first = this.map.keys().next();
      if (!first.done) this.map.delete(first.value);
    }
    this.map.set(key, value);
  }
  has(key: K): boolean {
    return this.map.has(key);
  }
}

const geoCache = new LRUMap<string, { lat: number | null; lon: number | null }>(150000);

interface NominatimResult {
  lat?: string;
  lon?: string;
  boundingbox?: string[];
}

function splitAddress(address: string): { street: string; city: string } {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const street = parts[0] ?? "";
  const city = parts.length > 1 ? parts.slice(1).join(", ") : "";
  return { street, city };
}

async function attemptSearch(params: URLSearchParams): Promise<{ lat: number | null; lon: number | null } | null> {
  try {
    const res = await fetch(`${NOMINATIM_URL}/search?${params}`, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = (await res.json()) as NominatimResult[];
    if (data.length > 0 && data[0].lat && data[0].lon) {
      return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
    }
  } catch {
    // ignore geocoding errors, fall through
  }
  return null;
}

async function geocodeRow(address: string, county: string, viewbox?: string): Promise<{ lat: number | null; lon: number | null }> {
  const cacheKey = `${address}|${county}`;
  const cached = geoCache.get(cacheKey);
  if (cached) return cached;

  const { street, city } = splitAddress(address);
  let result = { lat: null as number | null, lon: null as number | null };

  const withViewbox = (p: URLSearchParams) => {
    if (viewbox) {
      p.set("viewbox", viewbox);
      p.set("bounded", "1");
    }
    return p;
  };

  // Level 1: structured query (street addresses)
  if (street) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie", layer: "address" }));
    p.set("street", street);
    if (city) p.set("city", city);
    p.set("county", county);
    result = (await attemptSearch(p)) ?? result;
  }

  // Level 2: free-form full address (no layer restriction - townlands are excluded from layer=address)
  if (!result.lat) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie" }));
    p.set("q", `${address}, ${county}, Ireland`);
    result = (await attemptSearch(p)) ?? result;
  }

  // Level 3: free-form first part + county (rural townland matches)
  if (!result.lat && street && street !== address) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie" }));
    p.set("q", `${street}, ${county}, Ireland`);
    result = (await attemptSearch(p)) ?? result;
  }

  // Level 4: free-form bare first part, bounded to county viewbox (restores precision)
  if (!result.lat && street) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie" }));
    p.set("q", street);
    result = (await attemptSearch(p)) ?? result;
  }

  geoCache.set(cacheKey, result);
  return result;
}

async function getCountyViewboxes(prisma: import("@housing/db").PrismaClient): Promise<Map<string, string>> {
  const rows = await prisma.$queryRaw<Array<{ county: string }>>`
    SELECT DISTINCT county FROM "PropertySale" WHERE county IS NOT NULL
  `;
  const map = new Map<string, string>();
  for (const r of rows) {
    try {
      const found = await fetch(`${NOMINATIM_URL}/search?q=${encodeURIComponent(`${r.county}, Ireland`)}&format=jsonv2&limit=1&countrycodes=ie`, { signal: AbortSignal.timeout(8000) });
      if (!found.ok) continue;
      const parsed = (await found.json()) as NominatimResult[];
      if (parsed[0]?.boundingbox) {
        const [south, north, west, east] = parsed[0].boundingbox.map(Number);
        map.set(r.county, `${west},${south},${east},${north}`);
      }
    } catch {
      // ignore viewbox failures; geocoding falls back to unfiltered search
    }
  }
  return map;
}

async function main() {
  const { prisma } = await import('@housing/db');
  const limit = pLimit(CONCURRENCY);
  try {
    const viewboxes = await getCountyViewboxes(prisma);
    console.log(`Loaded ${viewboxes.size} county viewboxes.`);

    const totalRes = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "PropertySale" WHERE latitude IS NULL
    `;
    const total = Number(totalRes[0]?.count ?? 0);
    console.log(`Re-geocoding ${total} rows without coordinates...`);

    let done = 0;
    let fixed = 0;
    let lastId = "";
    const start = Date.now();

    for (;;) {
      const batch = await prisma.$queryRaw<Array<{ id: string; address: string | null; county: string | null }>>`
        SELECT id, address, county FROM "PropertySale"
        WHERE latitude IS NULL AND id > ${lastId}
        ORDER BY id
        LIMIT ${BATCH_SIZE}
      `;
      if (batch.length === 0) break;

      const results = await Promise.all(batch.map((row) => limit(async () => {
        if (!row.address || !row.county) return false;
        const coords = await geocodeRow(row.address, row.county, viewboxes.get(row.county));
        if (coords.lat && coords.lon) {
          await prisma.propertySale.update({
            where: { id: row.id },
            data: { latitude: coords.lat, longitude: coords.lon },
          });
          return true;
        }
        return false;
      })));

      fixed += results.filter(Boolean).length;
      done += batch.length;
      lastId = batch[batch.length - 1].id;

      const elapsed = (Date.now() - start) / 1000;
      const rate = done / elapsed;
      console.log(`Progress: ${done}/${total} rows, ${fixed} geocoded (${rate.toFixed(0)}/s)`);

      if (batch.length < BATCH_SIZE) break;
    }

    logInfo("regeocode_complete", { processed: done, geocoded: fixed });
  } catch (e) {
    logError("regeocode_failed", { error: String(e) });
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
