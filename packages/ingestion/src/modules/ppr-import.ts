"use client";

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
  process.env.DATABASE_URL = url;
}

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { parse } from "csv-parse";
import { propertySaleSchema } from "@housing/shared";
import { logError, logInfo } from "../lib/logger";
import pLimit from "p-limit";

const limit = pLimit(150);
const geoCache = new Map<string, { lat: number | null; lon: number | null; precision: string }>();

type PprCsvRow = Record<string, string>;
let prisma: any;

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

function parseEuroAmountToInt(value: string): number {
  const amount = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

function parseIrishDate(value: string): Date {
  const [dd, mm, yyyy] = value.split("/");
  return new Date(Date.UTC(Number(yyyy), Number(mm) - 1, Number(dd)));
}

function normalizeEircode(value: string): string | undefined {
  const raw = value.trim().toUpperCase().replace(/\s+/g, "");
  if (raw.length < 7) return undefined;
  const corrected = raw.split("").map((char, i) => (i >= 3 && char === "O" ? "0" : char)).join("");
  return `${corrected.slice(0, 3)} ${corrected.slice(3)}`;
}

function makeSourceKey(row: any): string {
  return createHash("sha1")
    .update(`${row.saleDate.toISOString()}|${row.address}|${row.priceEur}`)
    .digest("hex");
}

/* ================= GEOCODING ================= */

// Expanded list for better initial coverage
const routingKeyCoordinates: Record<string, { lat: number; lon: number }> = {
  D01: { lat: 53.3514, lon: -6.2557 }, D02: { lat: 53.3382, lon: -6.2591 },
  D06: { lat: 53.3135, lon: -6.2625 }, D14: { lat: 53.2952, lon: -6.2513 },
  K67: { lat: 53.4597, lon: -6.2181 }, // Swords
  A94: { lat: 53.2931, lon: -6.1772 }, // Blackrock
  A96: { lat: 53.2813, lon: -6.1345 }, // Glenageary
};

async function fetchCoordinates(eircode?: string, address?: string, county?: string) {
  const cacheKey = eircode || `${address}-${county}`;
  if (geoCache.has(cacheKey)) return geoCache.get(cacheKey)!;

  let result = { lat: null as number | null, lon: null as number | null, precision: 'MISSING' };

  try {
    if (eircode) {
      const res = await fetch(`http://localhost:8080/search?postalcode=${encodeURIComponent(eircode)}&countrycodes=ie&format=json&limit=1`);
      const data = await res.json() as any[];
      if (data.length > 0) {
        result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), precision: 'EXACT' };
      }
    }

    if (!result.lat && address) {
      const res = await fetch(`http://localhost:8080/search?q=${encodeURIComponent(`${address}, ${county}, Ireland`)}&format=json&limit=1`);
      const data = await res.json() as any[];
      if (data.length > 0) {
        result = { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon), precision: 'EXACT' };
      }
    }
  } catch (e) {
    logError("geocoding_api_error", { cacheKey });
  }

  if (!result.lat && eircode) {
    const rKey = eircode.slice(0, 3).toUpperCase();
    if (routingKeyCoordinates[rKey]) {
      result = { ...routingKeyCoordinates[rKey], precision: 'ROUTING_KEY' };
    }
  }

  geoCache.set(cacheKey, result);
  return result;
}

/* ================= PIPELINE ================= */

async function cleanRow(raw: Record<string, string>) {
  const saleDate = parseIrishDate(getSaleDate(raw));
  const priceEur = parseEuroAmountToInt(getPriceRaw(raw));
  const address = getCell(raw, "Address").trim().replace(/\s+/g, " ");
  const county = getCell(raw, "County").trim();
  const eircode = normalizeEircode(getCell(raw, "Eircode"));

  const coords = await fetchCoordinates(eircode, address, county);

  const data = {
    sourceKey: "",
    saleDate,
    address,
    county,
    eircode,
    priceEur,
    notFullMarketPrice: getCell(raw, "Not Full Market Price").toLowerCase() === "yes",
    vatExclusive: getCell(raw, "VAT Exclusive").toLowerCase() === "yes",
    descriptionOfProperty: getCell(raw, "Description of Property").trim(),
    latitude: coords.lat,
    longitude: coords.lon
  };

  data.sourceKey = makeSourceKey(data);
  return propertySaleSchema.parse(data);
}

async function processRow(record: any) {
  try {
    const cleaned = await cleanRow(record);
    return await prisma.propertySale.upsert({
      where: { sourceKey: cleaned.sourceKey },
      update: {
        latitude: cleaned.latitude ?? undefined,
        longitude: cleaned.longitude ?? undefined,
      },
      create: cleaned,
    });
  } catch (err) {
    return null;
  }
}

/* ================= SYNC LOGIC ================= */

/**
 * The Property Price Register (PPR) website uses a predictable URL pattern for monthly downloads:
 * Pattern: https://www.propertypriceregister.ie/website/npsra/pprweb.nsf/0/5C5D7606093556FE8025875C003D1974/$FILE/PPR-[YEAR]-[MONTH].csv
 * Example: https://www.propertypriceregister.ie/website/npsra/pprweb.nsf/0/5C5D7606093556FE8025875C003D1974/$FILE/PPR-2024-03.csv
 * 
 * Note: The middle hash '5C5D7606093556FE8025875C003D1974' is traditionally stable for the "Download" section.
 */
const PPR_DOWNLOAD_BASE = "https://www.propertypriceregister.ie/website/npsra/pprweb.nsf/0/5C5D7606093556FE8025875C003D1974/$FILE";

export async function syncLatestPprMonthly() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const filename = `PPR-${year}-${month}.csv`;
  const url = `${PPR_DOWNLOAD_BASE}/${filename}`;

  logInfo("Starting automated monthly sync", { url });

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch PPR data: ${response.statusText} (${response.status})`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body available from PPR site.");

    // Convert Web ReadableStream to Node.js Readable if possible, or just use a helper
    // For simplicity in this environment, we'll stream it manually
    const text = await response.text();
    const { Readable } = await import("node:stream");
    const stream = Readable.from([text]).pipe(parse({ columns: true, bom: true, skip_empty_lines: true }));

    return await runPprImportBatch(stream, filename);
  } catch (error) {
    logError("Monthly sync failed", { error: String(error) });
    throw error;
  }
}

export async function runPprImport(csvPath: string) {
  const stream = createReadStream(resolve(process.cwd(), csvPath))
    .pipe(parse({ columns: true, bom: true, skip_empty_lines: true }));
  
  return runPprImportBatch(stream, csvPath);
}

async function runPprImportBatch(stream: any, sourceName: string) {
  const run = await prisma.ingestionRun.create({ data: { source: `PPR-${sourceName}`, status: "RUNNING" } });
  let [rowsRead, rowsUpserted] = [0, 0];
  let promises: Promise<any>[] = [];

  for await (const record of stream) {
    rowsRead++;
    promises.push(limit(() => processRow(record)));

    if (promises.length >= 500) {
      const results = await Promise.all(promises);
      rowsUpserted += results.filter(r => r !== null).length;
      promises = [];
      if (geoCache.size > 50000) geoCache.clear();
    }
  }

  const finalResults = await Promise.all(promises);
  rowsUpserted += finalResults.filter(r => r !== null).length;

  await prisma.ingestionRun.update({
    where: { id: run.id },
    data: { status: "SUCCESS", rowsRead, rowsUpserted, finishedAt: new Date() }
  });
  
  logInfo("PPR Import Complete", { rowsRead, rowsUpserted });
}

async function main() {
  const db = await import("@housing/db");
  prisma = db.prisma;
  try {
    const arg = process.argv[2];
    if (arg === "--sync") {
      await syncLatestPprMonthly();
    } else {
      await runPprImport(arg || "PPR-ALL.csv");
    }
  } catch (error) {
    console.error("Pipeline Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

main();