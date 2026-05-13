import * as dotenv from "dotenv";
import { resolve } from "path";
import { logInfo, logError } from "../lib/logger";

dotenv.config({ path: resolve(process.cwd(), "../../.env") });
dotenv.config({ path: resolve(process.cwd(), ".env") });

export async function refreshMedianPriceCache(prismaOverride?: any) {
  const { prisma: prismaClient } = await import("@housing/db");
  const prisma = prismaOverride ?? prismaClient;

  try {
    logInfo("median_cache_refresh_start");

    const result = await prisma.$executeRaw`
      INSERT INTO "MedianPriceCache" (county, period, value, "saleCount", "refreshedAt")
      SELECT
        county,
        to_char(date_trunc('month', "saleDate"), 'YYYY-MM') AS period,
        percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float)::float AS value,
        COUNT(*)::int AS "saleCount",
        NOW() AS "refreshedAt"
      FROM "PropertySale"
      GROUP BY county, date_trunc('month', "saleDate")
      ON CONFLICT (county, period)
      DO UPDATE SET
        value = EXCLUDED.value,
        "saleCount" = EXCLUDED."saleCount",
        "refreshedAt" = NOW()
    `;

    logInfo("median_cache_refresh_complete", { rowsAffected: result });
    return result;
  } catch (e) {
    logError("median_cache_refresh_failed", { error: String(e) });
    throw e;
  } finally {
    if (!prismaOverride) await prisma.$disconnect();
  }
}

const isEntryPoint = process.argv[1]?.endsWith("refresh-median-price-cache.ts");
if (isEntryPoint) {
  refreshMedianPriceCache();
}