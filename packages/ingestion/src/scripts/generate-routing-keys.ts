import { resolve } from "node:path";
import * as dotenv from "dotenv";
import * as fs from "node:fs";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";

const prisma = new PrismaClient();

async function main() {
  console.log("Generating data-driven Eircode centroids from database...");

  // Query database for averages
  const results = await prisma.$queryRaw<
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

  console.log("Found " + results.length + " unique routing keys.");

  let dictString = "// Dictionary of major Eircode routing keys and their approximate centroid coordinates\n";
  dictString += "// GENERATED AUTOMATICALLY FROM GROUND-TRUTH DATABASE\n";
  dictString += "export const routingKeyCoordinates: Record<string, { lat: number; lon: number }> = {\n";
  
  for (const row of results) {
    if (row.routingkey.length === 3) {
      dictString += '  "' + row.routingkey + '": { lat: ' + row.lat + ', lon: ' + row.lon + ' },\n';
    }
  }
  dictString += "};\n\n";

  // Preserve the locality mapping and heuristic logic
  dictString += `// Map of town/locality to routing key
const localityToRoutingKey: Record<string, string> = {
  "SWORDS": "K67",
  "BLACKROCK": "A94",
  "DUN LAOGHAIRE": "A96",
  "GLENAGEARY": "A96",
  "BRAY": "A98",
  "GREYSTONES": "A63",
  "GALWAY": "H91",
  "CORK": "T12",
  "LIMERICK": "V94",
  "WATERFORD": "X91",
  "DROGHEDA": "A92",
  "DUNDALK": "A91",
  "NAVAN": "C15",
  "ENNIS": "V95",
  "KILKENNY": "R95",
  "TRALEE": "V92",
  "CARLOW": "R93",
  "NEWBRIDGE": "W12",
  "NAAS": "W91",
  "ATHLONE": "N37",
  "MULLINGAR": "N91",
  "WEXFORD": "Y35",
  "LETTERKENNY": "F92",
  "SLIGO": "F91",
  "CLONMEL": "E91",
  "TULLAMORE": "R35",
  "CASTLEBAR": "F23",
  "KILLARNEY": "V93",
  "ARKLOW": "Y14",
  "COBH": "P24",
  "ASHBOURNE": "A84",
  "CAVAN": "H12"
};

/**
 * Attempts to estimate the Eircode routing key based on the address string
 */
export function estimateRoutingKey(address: string, county: string): string | null {
  const upperAddress = address.toUpperCase();

  // Handle Dublin postal districts
  if (county.toUpperCase() === "DUBLIN" || upperAddress.includes("DUBLIN")) {
    const dublinMatch = upperAddress.match(/DUBLIN\\s*(1|2|3|4|5|6|6W|7|8|9|10|11|12|13|14|15|16|17|18|20|22|24)\\b/);
    if (dublinMatch) {
      let district = dublinMatch[1];
      if (district === "6W") return "D6W";
      return \`D\${district.padStart(2, "0")}\`;
    }
  }

  // Check against our mapped localities
  for (const [locality, routingKey] of Object.entries(localityToRoutingKey)) {
    const regex = new RegExp(\`\\\\b\${locality}\\\\b\`);
    if (regex.test(upperAddress)) {
      return routingKey;
    }
  }

  return null;
}
`;

  const destPath = resolve(process.cwd(), "packages/ingestion/src/lib/eircode-heuristics.ts");
  fs.writeFileSync(destPath, dictString);
  console.log("Successfully updated eircode-heuristics.ts");
}

main()
  .catch((e) => {
    console.error("Failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
