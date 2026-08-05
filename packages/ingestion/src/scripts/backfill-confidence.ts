import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient, Prisma, PropertySale } from "@housing/db";
import { computeCoordinateConfidence, getErrorByRoutingKey } from "../lib/geocode-confidence";

const prisma = new PrismaClient();

const BATCH_SIZE = 500;
const BATCH_DELAY_MS = 50;

async function main() {
  console.log("Loading measured routing-key errors...");
  const errorByRoutingKey = await getErrorByRoutingKey(prisma);
  console.log(`Loaded ${errorByRoutingKey.size} routing keys with measured error.`);

  let processed = 0;
  let scored = 0;
  let cursor: string | undefined = undefined;

  while (true) {
    const properties: PropertySale[] = await prisma.propertySale.findMany({
      where: { coordinateConfidence: null },
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
      const { confidence, errorMeters } = computeCoordinateConfidence({
        latitude: property.latitude,
        longitude: property.longitude,
        estimatedLatitude: property.estimatedLatitude,
        estimatedLongitude: property.estimatedLongitude,
        estimatedEircode: property.estimatedEircode,
        address: property.address,
        errorByRoutingKey,
      });
      updates.push(
        prisma.propertySale.update({
          where: { id: property.id },
          data: {
            coordinateConfidence: confidence,
            coordinateErrorMeters: errorMeters,
          },
        }),
      );
      if (confidence != null) scored++;
    }

    if (updates.length > 0) {
      await prisma.$transaction(updates);
    }

    if (processed % 10000 === 0) {
      console.log(`Processed ${processed}, scored ${scored} so far...`);
    }

    await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
  }

  console.log(`Backfill complete. Processed ${processed} total records. Scored ${scored} records.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
