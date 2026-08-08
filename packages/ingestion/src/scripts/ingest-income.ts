import { resolve } from "node:path";
import * as dotenv from "dotenv";
dotenv.config({ path: resolve(process.cwd(), ".env") });

import { upsertCsoMetrics } from "../modules/cso";
import { fetchCsoIncomeMetrics } from "../modules/income";
import { logInfo, logError } from "../lib/logger";
import type { PrismaClient } from "@housing/db";

let prisma: PrismaClient;

async function main() {
  const db = await import("@housing/db");
  prisma = db.prisma;

  logInfo("Starting CSO Income Ingestion Job (RAA02)");

  try {
    logInfo("Downloading and parsing JSON-stat payload from CSO...");
    const metrics = await fetchCsoIncomeMetrics();

    logInfo(`Successfully parsed ${metrics.length} income metric data points (skipping nulls).`);
    logInfo("Upserting into database...");

    const result = await upsertCsoMetrics(prisma, metrics);
    logInfo("CSO Income Ingestion Complete", result);
  } catch (error) {
    logError("Failed to ingest CSO income metrics", { error });
    process.exit(1);
  } finally {
    if (prisma) await prisma.$disconnect();
  }
}

main();
