import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";
import { APARTMENT_ADDRESS_REGEX_SQL } from "../lib/housing-type";

const prisma = new PrismaClient();

async function main() {
  console.log("Backfilling isApartment from address regex...");
  const updated = await prisma.$executeRawUnsafe(
    `UPDATE "PropertySale" SET "isApartment" = (address ~* $1) WHERE "isApartment" IS NULL`,
    APARTMENT_ADDRESS_REGEX_SQL,
  );
  console.log(`Backfill complete. ${updated} rows updated.`);

  const counts = await prisma.$queryRawUnsafe<Array<{ isApartment: boolean | null; count: number }>>(
    `SELECT "isApartment", COUNT(*)::int AS count FROM "PropertySale" GROUP BY 1 ORDER BY 1`,
  );
  for (const row of counts) {
    console.log(`isApartment=${row.isApartment}: ${row.count} rows`);
  }
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
