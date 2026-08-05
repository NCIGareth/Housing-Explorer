/* Shared Nominatim geocoding: 4-level fallback cascade.
 * Level 1: structured street/city/county (layer=address) — real street addresses
 * Level 2: free-form full address
 * Level 3: free-form first part + county (rural townland matches)
 * Level 4: free-form bare first part, bounded to the county viewbox
 * All levels are scoped by county viewbox+bounded when one is provided, which
 * both improves recall (bare queries) and preserves precision (no wrong-county
 * matches).
 */

const NOMINATIM_URL = process.env.NOMINATIM_URL || "http://localhost:8080";

export interface NominatimResult {
  lat?: string;
  lon?: string;
  boundingbox?: string[];
}

export type Throttle = () => Promise<void>;

export class LRUMap<K, V> {
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

export async function attemptSearch(
  params: URLSearchParams,
  throttle?: Throttle,
  headers?: Record<string, string>,
): Promise<{ lat: number | null; lon: number | null } | null> {
  try {
    if (throttle) await throttle();
    const res = await fetch(`${NOMINATIM_URL}/search?${params}`, {
      signal: AbortSignal.timeout(8000),
      headers,
    });
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

export function splitAddress(address: string): { street: string; city: string } {
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  const street = parts[0] ?? "";
  const city = parts.length > 1 ? parts.slice(1).join(", ") : "";
  return { street, city };
}

export async function geocodeRow(
  address: string,
  county: string,
  viewbox?: string,
  throttle?: Throttle,
  headers?: Record<string, string>,
): Promise<{ lat: number | null; lon: number | null }> {
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
    result = (await attemptSearch(p, throttle, headers)) ?? result;
  }

  // Level 2: free-form full address (no layer restriction - townlands are excluded from layer=address)
  if (!result.lat) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie" }));
    p.set("q", `${address}, ${county}, Ireland`);
    result = (await attemptSearch(p, throttle, headers)) ?? result;
  }

  // Level 3: free-form first part + county (rural townland matches)
  if (!result.lat && street && street !== address) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie" }));
    p.set("q", `${street}, ${county}, Ireland`);
    result = (await attemptSearch(p, throttle, headers)) ?? result;
  }

  // Level 4: free-form bare first part, bounded to county viewbox (restores precision)
  if (!result.lat && street) {
    const p = withViewbox(new URLSearchParams({ format: "jsonv2", limit: "1", countrycodes: "ie" }));
    p.set("q", street);
    result = (await attemptSearch(p, throttle, headers)) ?? result;
  }

  geoCache.set(cacheKey, result);
  return result;
}

export async function fetchCountyViewboxes(counties: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  for (const county of counties) {
    try {
      const found = await fetch(
        `${NOMINATIM_URL}/search?q=${encodeURIComponent(`${county}, Ireland`)}&format=jsonv2&limit=1&countrycodes=ie`,
        { signal: AbortSignal.timeout(8000) },
      );
      if (!found.ok) continue;
      const parsed = (await found.json()) as NominatimResult[];
      if (parsed[0]?.boundingbox) {
        const [south, north, west, east] = parsed[0].boundingbox.map(Number);
        map.set(county, `${west},${south},${east},${north}`);
      }
    } catch {
      // ignore viewbox failures; geocoding falls back to unfiltered search
    }
  }
  return map;
}
