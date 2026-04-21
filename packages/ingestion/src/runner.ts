import { resolve } from "node:path";
import * as dotenv from "dotenv";

// 1. Load the environment
dotenv.config({ path: resolve(process.cwd(), ".env") });

// 2. Hardened Sanitization
if (process.env.DATABASE_URL) {
  let url = process.env.DATABASE_URL.replace(/"/g, '').trim();
  
  // Fix the truncation: If it ends in 'schema', append '=public'
  if (url.endsWith('?schema')) {
    url += '=public';
  } else if (!url.includes('schema=')) {
    url += (url.includes('?') ? '&' : '?') + 'schema=public';
  }
  
  process.env.DATABASE_URL = url;
}

// 3. Import logic that DOES NOT depend on Prisma at the top level
import { fetchCsoMetrics, upsertCsoMetrics } from "./modules/cso";
import { logError, logInfo } from "./lib/logger";

// 4. Declare a variable for prisma that will be populated later
let prisma: any;

async function runIngestion(source: string, execute: () => Promise<{ rowsRead: number; rowsUpserted: number }>) {
  const run = await prisma.ingestionRun.create({
    data: { source, status: "RUNNING" }
  });

  try {
    const result = await execute();
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        rowsRead: result.rowsRead,
        rowsUpserted: result.rowsUpserted,
        finishedAt: new Date()
      }
    });
    logInfo("ingestion_completed", { source, ...result });
  } catch (error) {
    await prisma.ingestionRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        error: error instanceof Error ? error.message : "Unknown error",
        finishedAt: new Date()
      }
    });
    logError("ingestion_failed", { source, error: String(error) });
    throw error;
  }
}

async function runAllIngestion() {
  const runningRuns = await prisma.ingestionRun.findMany({
    where: {
      status: "RUNNING",
      startedAt: { gt: new Date(Date.now() - 60 * 60 * 1000) }
    }
  });

  if (runningRuns.length > 0) {
    const sources = runningRuns.map((r: any) => r.source).join(', ');
    throw new Error(`Ingestion already running for sources: ${sources}`);
  }

  await runIngestion("CSO", async () => upsertCsoMetrics(await fetchCsoMetrics()));
}

// 5. The "Brain" - Controls the sequence
async function main() {
  console.log('FINAL_ENV_VAL:', `|${process.env.DATABASE_URL}|`);
  // Dynamically import the database package ONLY after env is cleaned
  const db = await import("@housing/db");
  prisma = db.prisma;

  try {
    await runAllIngestion();
    await prisma.$disconnect();
  } catch (err) {
    logError("runner_fatal_error", { error: String(err) });
    if (prisma) await prisma.$disconnect();
    process.exit(1);
  }
}

main();