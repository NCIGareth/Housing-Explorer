import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient, Prisma, PropertySale } from "@housing/db";
import { estimateRoutingKey, routingKeyCoordinates } from "../lib/eircode-heuristics";

const prisma = new PrismaClient();

const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 100;

function estimateFor(property: PropertySale): {
  estimatedEircode: string | null;
  estimatedLatitude: number | null;
  estimatedLongitude: number | null;
} {
  const estimatedEircode = property.eircode
    ? property.eircode.slice(0, 3).toUpperCase()
    : estimateRoutingKey(property.address, property.county);

  let estimatedLatitude: number | null = null;
  let estimatedLongitude: number | null = null;

  if (estimatedEircode && routingKeyCoordinates[estimatedEircode]) {
    estimatedLatitude = routingKeyCoordinates[estimatedEircode].lat;
    estimatedLongitude = routingKeyCoordinates[estimatedEircode].lon;
  }

  return { estimatedEircode, estimatedLatitude, estimatedLongitude };
}

async function main() {
  console.log("Starting backfill of estimated eircodes/coordinates...");

  let processed = 0;
  let updated = 0;
  let cursor: string | undefined = undefined;

  while (true) {
    const properties: PropertySale[] = await prisma.propertySale.findMany({
      where: {
        OR: [{ estimatedLatitude: null }, { estimatedEircode: null }],
      },
      take: BATCH_SIZE,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: "asc" },
    });

    if (properties.length === 0) break;
    cursor = properties[properties.length - 1].id;

    const updates: Prisma.PrismaPromise<PropertySale>[] = [];
    for (const property of properties) {
      processed++;
      const estimate = estimateFor(property);
      if (!estimate.estimatedEircode && !estimate.estimatedLatitude) continue;
      updates.push(
        prisma.propertySale.update({
          where: { id: property.id },
          data: {
            estimatedEircode: estimate.estimatedEircode,
            estimatedLatitude: estimate.estimatedLatitude,
            estimatedLongitude: estimate.estimatedLongitude,
          },
        }),
      );
      updated++;
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    if (processed % 5000 === 0 || properties.length < BATCH_SIZE) {
      console.log(`Processed ${processed}, updated ${updated} so far...`);
    }

    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log(`Backfill complete. Processed ${processed} total records. Updated ${updated} records.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
