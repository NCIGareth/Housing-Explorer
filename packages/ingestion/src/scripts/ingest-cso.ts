import { resolve } from "node:path";
import * as dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { fetchCsoMetrics, upsertCsoMetrics } from "../modules/cso";
import { logInfo, logError } from "../lib/logger";

let prisma: any;

async function main() {
  const db = await import("@housing/db");
  prisma = db.prisma;

  logInfo("Starting CSO Ingestion Job (RPPI)");

  try {
    logInfo("Downloading and parsing JSON-stat payload from CSO...");
    const metrics = await fetchCsoMetrics();
    
    logInfo(`Successfully parsed ${metrics.length} relevant metric data points (skipping nulls and percentages).`);
    logInfo("Upserting into database...");
    
    const result = await upsertCsoMetrics(metrics);
    logInfo("CSO Ingestion Complete", result);

  } catch (error) {
    logError("Failed to ingest CSO metrics", { error });
    process.exit(1);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main();
