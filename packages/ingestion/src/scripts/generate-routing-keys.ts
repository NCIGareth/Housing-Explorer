import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as dotenv from "dotenv";
import * as fs from "node:fs";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";

const prisma = new PrismaClient();

const COUNTY_NAMES = new Set(
  [
    "DUBLIN", "CORK", "GALWAY", "LIMERICK", "WATERFORD", "KILKENNY",
    "WEXFORD", "CARLOW", "WICKLOW", "KILDARE", "MEATH", "LOUTH",
    "MONAGHAN", "CAVAN", "LONGFORD", "WESTMEATH", "OFFALY", "LAOIS",
    "TIPPERARY", "CLARE", "KERRY", "MAYO", "ROSCOMMON", "SLIGO",
    "LEITRIM", "DONEGAL", "ANTRIM", "DOWN", "ARMAGH", "DERRY",
    "FERMANAGH", "TYRONE",
  ].map((c) => c.toUpperCase()),
);

const STREET_SUFFIX =
  /\b(ST|RD|ROAD|AVE|AVENUE|TER|TERRACE|LN|LANE|CL|CLOSE|PK|PARK|DR|DRIVE|GR|GROVE|GDNS|GARDENS|CRESCENT|SQUARE|RISE|WALK|PL|PLACE|COURT|LAWN|VIEW|HEIGHTS|WOODS|ESTATE|VILLAS|GATE|MANOR|TCE|CRT|WAY|BYPASS|CIRCUIT|MEWS|QUAY|ROW|VALE|PARKWAY|APPARTMENTS|APTS)\b/;

const MIN_LOCALITY_ROWS = 2;
const MIN_LOCALITY_SHARE = 0.6;

function normalizeCounty(c: string): string {
  return c.toUpperCase().replace(/^CO\.?\s+/, "").replace(/^COUNTY\s+/, "").trim();
}

function isValidSettlement(s: string): boolean {
  if (s.length < 3) return false;
  if (/^\d+$/.test(s)) return false;
  if (/^DUBLIN\s*\d+$/.test(s)) return false;
  if (STREET_SUFFIX.test(s)) return false;
  return true;
}

function extractSettlement(address: string, county: string): string | null {
  const countyUpper = normalizeCounty(county);
  const tokens = address.toUpperCase().split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) return null;

  // Strip at most ONE trailing county token ("Co. Cork", "CO CORK", "County Cork").
  // A bare county-name token further in (e.g. "…, Limerick, Co Limerick") is the TOWN.
  let poppedCounty: string | null = null;
  {
    const last = tokens[tokens.length - 1];
    const stripped = normalizeCounty(last);
    if (COUNTY_NAMES.has(stripped) || /^DUBLIN\s*\d+$/.test(last)) {
      poppedCounty = stripped;
      tokens.pop();
    }
  }

  if (tokens.length === 0) return null;
  const settlement = tokens[tokens.length - 1];
  if (isValidSettlement(settlement)) return settlement;

  // Last real token was street-like/numeric: the town may be the popped county
  // name itself (e.g. "…, Model Farm Road, Cork" -> town "CORK").
  if (poppedCounty === countyUpper) return poppedCounty;
  return null;
}

function emitEntry(name: string): string {
  return name.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

async function main() {
  console.log("Generating data-driven Eircode centroids + locality map from database...");

  // ─── Routing key centroids ───
  const centroids = await prisma.$queryRaw<
    Array<{ routingkey: string; lat: number; lon: number }>
  >`
    SELECT
      substring(eircode from 1 for 3) as routingkey,
      AVG(latitude) as lat,
      AVG(longitude) as lon
    FROM "PropertySale"
    WHERE eircode IS NOT NULL
      AND latitude IS NOT NULL
      AND longitude IS NOT NULL
      AND length(eircode) >= 7
    GROUP BY substring(eircode from 1 for 3)
  `;

  // ─── Data-driven locality → routing key map ───
  const rows = await prisma.$queryRaw<Array<{ address: string; county: string; eircode: string }>>`
    SELECT address, county, eircode
    FROM "PropertySale"
    WHERE eircode IS NOT NULL AND length(eircode) >= 7
  `;

  const tally = new Map<string, Map<string, Map<string, number>>>();
  for (const row of rows) {
    if (!row.address) continue;
    const settlement = extractSettlement(row.address, row.county);
    if (!settlement) continue;
    const key = row.eircode.slice(0, 3).toUpperCase();
    const countyUpper = normalizeCounty(row.county);
    let byCounty = tally.get(countyUpper);
    if (!byCounty) { byCounty = new Map(); tally.set(countyUpper, byCounty); }
    let bySettlement = byCounty.get(settlement);
    if (!bySettlement) { bySettlement = new Map(); byCounty.set(settlement, bySettlement); }
    bySettlement.set(key, (bySettlement.get(key) ?? 0) + 1);
  }

  const localityByCounty: Record<string, Record<string, string>> = {};
  for (const [county, byCounty] of tally) {
    const map: Record<string, string> = {};
    for (const [settlement, byKey] of byCounty) {
      const total = Array.from(byKey.values()).reduce((a, b) => a + b, 0);
      if (total < MIN_LOCALITY_ROWS) continue;
      let bestKey = "";
      let bestCount = 0;
      for (const [key, count] of byKey) {
        if (count > bestCount) { bestCount = count; bestKey = key; }
      }
      if (bestKey && bestCount / total >= MIN_LOCALITY_SHARE) {
        map[settlement] = bestKey;
      }
    }
    if (Object.keys(map).length > 0) {
      localityByCounty[county] = map;
    }
  }

  const countyTotal = Object.values(localityByCounty).reduce((a, m) => a + Object.keys(m).length, 0);
  console.log(`Found ${centroids.length} routing key centroids; ${countyTotal} locality entries across ${Object.keys(localityByCounty).length} counties.`);

  // ─── Emit heuristics file ───
  let out = "// Dictionary of major Eircode routing keys and their approximate centroid coordinates\n";
  out += "// GENERATED AUTOMATICALLY FROM GROUND-TRUTH DATABASE\n";
  out += "export const routingKeyCoordinates: Record<string, { lat: number; lon: number }> = {\n";
  for (const row of centroids) {
    if (row.routingkey.length === 3) {
      out += `  "${row.routingkey}": { lat: ${row.lat}, lon: ${row.lon} },\n`;
    }
  }
  out += "};\n\n";

  out += "// Map of town/locality (per county) to routing key — data-driven\n";
  out += "export const localityByCounty: Record<string, Record<string, string>> = {\n";
  for (const [county, map] of Object.entries(localityByCounty)) {
    out += `  "${emitEntry(county)}": {\n`;
    for (const [settlement, key] of Object.entries(map)) {
      out += `    "${emitEntry(settlement)}": "${key}",\n`;
    }
    out += "  },\n";
  }
  out += "};\n\n";

  out += `/**
 * Attempts to estimate the Eircode routing key based on the address string
 */
export function estimateRoutingKey(address: string, county: string): string | null {
  const upperAddress = address.toUpperCase();
  const upperCounty = county.toUpperCase().replace(/^CO\\.?\\s+/, "").replace(/^COUNTY\\s+/, "").trim();

  // Handle Dublin postal districts
  if (upperCounty === "DUBLIN" || upperAddress.includes("DUBLIN")) {
    const dublinMatch = upperAddress.match(/DUBLIN\\s*(1|2|3|4|5|6|6W|7|8|9|10|11|12|13|14|15|16|17|18|20|22|24)\\b/);
    if (dublinMatch) {
      const district = dublinMatch[1];
      return district === "6W" ? "D6W" : "D" + district.padStart(2, "0");
    }
  }

  // Per-county locality lookup: scan comma tokens from the last, matching stored settlements
  const map = localityByCounty[upperCounty];
  if (map) {
    const tokens = upperAddress.split(",").map((t) => t.trim()).filter(Boolean);
    for (let i = tokens.length - 1; i >= 0; i--) {
      let key = map[tokens[i]];
      if (!key) {
        // Handle qualifier variants ("Cork City", "Drogheda Town", "Newcastle West")
        const stripped = tokens[i].replace(/\\s+(CITY|TOWN|VILLAGE|NORTH|SOUTH|EAST|WEST|UPPER|LOWER|GREATER)\\s*$/, "");
        if (stripped !== tokens[i]) key = map[stripped];
      }
      if (key) return key;
    }
  }

  return null;
}
`;

  const destPath = fileURLToPath(new URL("../lib/eircode-heuristics.ts", import.meta.url));
  fs.writeFileSync(destPath, out);
  console.log(`Successfully updated ${destPath}`);
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
