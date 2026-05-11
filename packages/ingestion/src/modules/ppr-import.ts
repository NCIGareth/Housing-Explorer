import { resolve } from "node:path";
import * as dotenv from "dotenv";

// 1. Environment reliability
dotenv.config({ path: resolve(process.cwd(), ".env") });

// 2. Database URL sanitization
if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.replace(/"/g, '').trim();
  if (url.endsWith('?schema')) {
    url += '=public';
  } else if (!url.includes('schema=')) {
    url += (url.includes('?') ? '&' : '?') + 'schema=public';
  }
  
  // Hard-cap the connection pool for ingestion to avoid Supabase Free Tier limits
  if (!url.includes('connection_limit=')) {
    url += (url.includes('?') ? '&' : '?') + 'connection_limit=10';
  }
  process.env.DATABASE_URL = url;
}

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import https from "node:https";
import { parse } from "csv-parse";
import { propertySaleSchema } from "@housing/shared";
import { logError, logInfo } from "../lib/logger";
import { estimateRoutingKey, routingKeyCoordinates } from "../lib/eircode-heuristics";
import pLimit from "p-limit";
import type { PrismaClient } from "@housing/db";

const RETENTION_YEARS = 13;

// PPR site has an incomplete SSL cert chain — use a permissive agent just for this domain
const pprAgent = new https.Agent({ rejectUnauthorized: false });

// 1. Concurrency limit: Reduced to 10 to stay within Supabase session limits.
const limit = pLimit(10);

// 2. Geocoding Cache with LRU eviction: Prevents memory exhaustion while keeping recent entries.
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
  clear(): void {
    this.map.clear();
  }
}

const geoCache = new LRUMap<string, { lat: number | null; lon: number | null; precision: string }>(50000);

type PprCsvRow = Record<string, string>;
let prisma: PrismaClient;

/* ================= HELPERS ================= */

function getSaleDate(row: PprCsvRow): string {
  const key = Object.keys(row).find(k => k.toLowerCase().includes("date of sale") || k.toLowerCase().startsWith("date"));
  return key ? row[key] : "";
}

function getPriceRaw(row: PprCsvRow): string {
  const key = Object.keys(row).find(k => /^price\s*\(|price/i.test(k));
  return key ? row[key] : "";
}

function getCell(row: PprCsvRow, ...substrings: string[]): string {
  const key = Object.keys(row).find(k => substrings.some(s => k.toLowerCase().includes(s.toLowerCase())));
  return key ? (row[key] ?? "") : "";
}

type NominatimResult = { lat: string; lon: string };

function parseEuroAmountToInt(value: string): number {
  const amount = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function parseIrishDate(value: string): Date {
  const [dd, mm, yyyy] = value.split("/");
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

export function normalizeEircode(value: string): string | undefined {
  const raw = value.trim().toUpperCase().replace(/\s+/g, "");
  if (raw.length < 7) return undefined;
  const corrected = raw.split("").map((char, i) => (i >= 3 && char === "O" ? "0" : char)).join("");
  return `${corrected.slice(0, 3)} ${corrected.slice(3)}`;
}

function toProperCase(str: string): string {
  // Title-case by word (not \b which breaks on apostrophes), then fix hyphens and Irish prefixes
  return str.toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
    .replace(/-(\w)/g, (_, c) => "-" + c.toUpperCase())
    .replace(/\b[ODN]'\w/g, c => c.slice(0, 2) + c.charAt(2).toUpperCase() + c.slice(3))
    .replace(/\bMc\w/g, c => c.slice(0, 2) + c.charAt(2).toUpperCase() + c.slice(3))
    .replace(/\bMac\w/g, c => c.slice(0, 3) + c.charAt(3).toUpperCase() + c.slice(4));
}

function normalizeAddress(address: string): string {
  const replacements: Record<string, string> = {
    ' RD': ' Road',
    ' RD.': ' Road',
    ' SQ': ' Square',
    ' SQ.': ' Square',
    ' AVE': ' Avenue',
    ' AVE.': ' Avenue',
    ' ST': ' Street',
    ' ST.': ' Street',
    ' PL': ' Place',
    ' PL.': ' Place',
    ' CT': ' Court',
    ' CT.': ' Court',
    ' CL': ' Close',
    ' CL.': ' Close',
    ' DR': ' Drive',
    ' DR.': ' Drive',
    ' PK': ' Park',
    ' PK.': ' Park',
    ' GN': ' Green',
    ' GN.': ' Green',
    ' TER': ' Terrace',
    ' TER.': ' Terrace',
    ' VILS': ' Villas',
    ' VILS.': ' Villas',
    ' HSE': ' House',
    ' APT': ' Apartment',
    ' APTS': ' Apartments',
    ' CO.': ' County'
  };

  let cleaned = ` ${address.trim().toUpperCase()}`; // Add space to match abbreviations at start
  
  Object.entries(replacements).forEach(([abbr, full]) => {
    const regex = new RegExp(`${abbr}(\\s|\\,|$|\\.)`, 'g');
    cleaned = cleaned.replace(regex, `${full}$1`);
  });

  return toProperCase(cleaned.trim());
}

function makeSourceKey(row: { saleDate: Date; address: string; priceEur: number }): string {
  return createHash("sha1")
    .update(`${row.saleDate.toISOString()}|${row.address.toLowerCase()}|${row.priceEur}`)
    .digest("hex");
}

/* ================= GEOCODING ================= */

const NOMINATIM_URL = process.env.NOMINATIM_URL || "http://localhost:8080";
const isPublicApi = NOMINATIM_URL.includes("nominatim.openstreetmap.org");
let lastGeocodeRequest = 0;

async function fetchCoordinates(eircode?: string, address?: string, county?: string) {
  const cacheKey = eircode || `${address}-${county}`;
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey)!;

  let result = { lat: null as number | null, lon: null as number | null, precision: 'MISSING' };

  try {
    const headers: Record<string, string> = isPublicApi
      ? { "User-Agent": "IrelandHousingExplorer/1.0 (github.com/your-org/housing)" }
      : {};

    if (isPublicApi) {
      const elapsed = Date.now() - lastGeocodeRequest;
      if (elapsed < 1100) await new Promise(r => setTimeout(r, 1100 - elapsed));
    }

    if (eircode) {
      const res = await fetch(`${NOMINATIM_URL}/search?postalcode=${encodeURIComponent(eircode)}&countrycodes=ie&format=json&limit=1`, { headers });
      lastGeocodeRequest = Date.now();
      const data = await res.json() as NominatimResult[];
      if (data.length > 0) {
        result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), precision: 'EXACT' };
      }
    }

    if (!result.lat && address) {
      if (isPublicApi) {
        const elapsed = Date.now() - lastGeocodeRequest;
        if (elapsed < 1100) await new Promise(r => setTimeout(r, 1100 - elapsed));
      }
      const res = await fetch(`${NOMINATIM_URL}/search?q=${encodeURIComponent(`${address}, ${county}, Ireland`)}&format=json&limit=1`, { headers });
      lastGeocodeRequest = Date.now();
      const data = await res.json() as NominatimResult[];
      if (data.length > 0) {
        result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), precision: 'EXACT' };
      }
    }
  } catch (e) {
    logError("geocoding_api_error", { cacheKey });
  }

  geoCache.set(cacheKey, result);
  return result;
}

/* ================= PIPELINE ================= */

async function cleanRow(raw: Record<string, string>) {
  // Convert CSV strings into structured data types
  const saleDate = parseIrishDate(getCell(raw, "Date of Sale"));
  const priceEur = parseEuroAmountToInt(getPriceRaw(raw));
  const rawAddress = getCell(raw, "Address").trim();
  const address = normalizeAddress(rawAddress);
  const county = toProperCase(getCell(raw, "County").trim());
  const eircode = normalizeEircode(getCell(raw, "Eircode"));

  // Call local Nominatim (Docker) to get coordinates
  const coords = await fetchCoordinates(eircode, address, county);

  // Estimation logic
  let estimatedEircode = eircode ? eircode.slice(0, 3).toUpperCase() : estimateRoutingKey(address, county);
  let estimatedLatitude = null;
  let estimatedLongitude = null;

  if (estimatedEircode && routingKeyCoordinates[estimatedEircode]) {
    estimatedLatitude = routingKeyCoordinates[estimatedEircode].lat;
    estimatedLongitude = routingKeyCoordinates[estimatedEircode].lon;
  }

  const data = {
    sourceKey: "", // Unique identifier for deduplication
    saleDate,
    address,
    county,
    eircode,
    priceEur,
    notFullMarketPrice: getCell(raw, "Not Full Market Price").toLowerCase() === "yes",
    vatExclusive: getCell(raw, "VAT Exclusive").toLowerCase() === "yes",
    descriptionOfProperty: getCell(raw, "Description of Property").trim(),
    latitude: coords.lat,
    longitude: coords.lon,
    estimatedEircode,
    estimatedLatitude,
    estimatedLongitude
  };

  data.sourceKey = makeSourceKey(data);
  return propertySaleSchema.parse(data);
}

async function processRow(record: PprCsvRow, retryCount = 0): Promise<{ id: string } | null> {
  try {
    const cleaned = await cleanRow(record);
    return await prisma.propertySale.upsert({
      where: { sourceKey: cleaned.sourceKey },
      update: {
        latitude: cleaned.latitude ?? undefined,
        longitude: cleaned.longitude ?? undefined,
        estimatedEircode: cleaned.estimatedEircode ?? undefined,
        estimatedLatitude: cleaned.estimatedLatitude ?? undefined,
        estimatedLongitude: cleaned.estimatedLongitude ?? undefined,
      },
      create: cleaned,
    });
  } catch (err: unknown) {
    const prismaErr = err as { code?: string; message?: string };
    if (prismaErr.code === 'P2002') return { id: 'duplicate' };

    const isTransient = prismaErr.message?.includes('connection') || prismaErr.message?.includes('closed') || prismaErr.message?.includes('pool');
    if (retryCount < 3 && isTransient) {
      const delay = 1000 * (retryCount + 1);
      await new Promise(r => setTimeout(r, delay));
      return processRow(record, retryCount + 1);
    }
    return null;
  }
}

/* ================= SYNC LOGIC ================= */

/**
 * The Property Price Register (PPR) website uses a predictable URL pattern for monthly downloads.
 * We use this to automatically sync the most recent month's data.
 */
const PPR_DOWNLOAD_BASE = "https://www.propertypriceregister.ie/website/npsra/ppr/npsra-ppr.nsf/Downloads";

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { agent: pprAgent }, (res) => {
      if (!res.statusCode || res.statusCode >= 400) {
        reject(new Error(`Failed to fetch PPR data: ${res.statusMessage} (${res.statusCode})`));
        return;
      }
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
    }).on("error", reject);
  });
}

export async function syncLatestPprMonthly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const filename = `PPR-${year}-${month}.csv`;
  const url = `${PPR_DOWNLOAD_BASE}/${filename}/$FILE/${filename}`;

  logInfo("Starting automated monthly sync", { url });

  try {
    const text = await httpsGet(url);
    const { Readable } = await import("node:stream");
    const stream = Readable.from([text]).pipe(parse({ columns: true, bom: true, skip_empty_lines: true }));
    return await runPprImportBatch(stream, filename);
  } catch (error) {
    logError("Monthly sync failed", { error: String(error) });
    throw error;
  }
}

export async function runPprImport(csvPath: string, sinceYear?: number) {
  const absolutePath = resolve(process.cwd(), csvPath);
  logInfo("Opening CSV file", { path: absolutePath, cwd: process.cwd() });
  const stream = createReadStream(absolutePath)
    .pipe(parse({ columns: true, bom: true, skip_empty_lines: true }));

  return runPprImportBatch(stream, csvPath, sinceYear);
}

async function runPprImportBatch(stream: AsyncIterable<PprCsvRow>, sourceName: string, sinceYear?: number) {
  const run = await prisma.ingestionRun.create({ data: { source: `PPR-${sourceName}`, status: "RUNNING" } });
  let [rowsRead, rowsUpserted] = [0, 0];
  let promises: Promise<{ id: string } | null>[] = [];

  for await (const record of stream) {
    rowsRead++;

    if (sinceYear) {
      const saleDate = parseIrishDate(getSaleDate(record));
      if (saleDate.getUTCFullYear() < sinceYear) continue;
    }

    promises.push(limit(() => processRow(record)));

    if (promises.length >= 500) {
      const results = await Promise.all(promises);
      rowsUpserted += results.filter(r => r !== null).length;
      console.log(`Progress: ${rowsRead} rows processed, ${rowsUpserted} upserted...`);
      promises = [];
    }
  }

  const finalResults = await Promise.all(promises);
  rowsUpserted += finalResults.filter(r => r !== null).length;

  await prisma.ingestionRun.update({
    where: { id: run.id },
    data: { status: "SUCCESS", rowsRead, rowsUpserted, finishedAt: new Date() }
  });

  logInfo("PPR Import Complete", { rowsRead, rowsUpserted });

  await pruneOldPropertySales();
}

async function pruneOldPropertySales() {
  const cutoffYear = new Date().getFullYear() - RETENTION_YEARS;
  const cutoffDate = new Date(`${cutoffYear}-01-01T00:00:00Z`);

  const [{ count }] = await prisma.$queryRawUnsafe<[{ count: number }]>(
    `SELECT COUNT(*)::int AS count FROM "PropertySale" WHERE "saleDate" < $1`,
    cutoffDate
  );

  if (count === 0) {
    logInfo("prune_skip", { reason: "no rows older than cutoff", cutoffYear });
    return;
  }

  logInfo("prune_start", { rowsToDelete: count, cutoffYear });

  let deleted = 0;
  while (deleted < count) {
    const result = await prisma.$executeRawUnsafe(
      `DELETE FROM "PropertySale" WHERE "ctid" IN (SELECT "ctid" FROM "PropertySale" WHERE "saleDate" < $1 LIMIT 5000)`,
      cutoffDate
    );
    deleted += result;
    if (result === 0) break;
  }

  logInfo("prune_complete", { rowsDeleted: deleted, cutoffYear });
}

async function main() {
  const db = await import("@housing/db");
  prisma = db.prisma;
  let exitCode = 0;
  try {
    const args = process.argv.slice(2);
    const syncMode = args.includes("--sync");
    const sinceIdx = args.indexOf("--since");
    const sinceYear = sinceIdx !== -1 ? parseInt(args[sinceIdx + 1], 10) : undefined;

    if (syncMode) {
      await syncLatestPprMonthly();
    } else {
      const csvPath = args.find(a => !a.startsWith("-") && a.toLowerCase().endsWith(".csv")) || "../../PPR-ALL.csv";
      await runPprImport(csvPath, sinceYear);
    }
  } catch (error) {
    console.error("Pipeline Error:", error);
    exitCode = 1;
  } finally {
    await prisma.$disconnect();
    process.exit(exitCode);
  }
}

main();