import { resolve } from "node:path";
import * as dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { upsertCsoMetrics } from "../modules/cso";
import { fetchCbiMortgageRates } from "../modules/cbi";
import { logInfo, logError } from "../lib/logger";
import type { PrismaClient } from "@housing/db";

let prisma: PrismaClient;

async function main() {
  const db = await import("@housing/db");
  prisma = db.prisma;

  logInfo("Starting CBI Mortgage Rates Ingestion Job (B.2.1 + B.3.1)");

  try {
    logInfo("Downloading and parsing CBI CSVs...");
    const metrics = await fetchCbiMortgageRates();

    logInfo(`Successfully parsed ${metrics.length} mortgage rate data points.`);
    logInfo("Upserting into database...");

    const result = await upsertCsoMetrics(prisma, metrics);
    logInfo("CBI Mortgage Rates Ingestion Complete", result);
  } catch (error) {
    logError("Failed to ingest CBI mortgage rates", { error });
    process.exit(1);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main();
