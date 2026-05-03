import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";
import { estimateRoutingKey, routingKeyCoordinates } from "../lib/eircode-heuristics";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting backfill for missing coordinates and Eircodes...");

  let processedCount = 0;
  let updatedCount = 0;
  const batchSize = 1000;
  let hasMore = true;
  let cursor: string | undefined = undefined;

  while (hasMore) {
    const properties: any[] = await prisma.propertySale.findMany({
      where: {
        OR: [
          { eircode: null },
          { latitude: null },
          { longitude: null }
        ]
      },
      take: batchSize,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { id: 'asc' }
    });

    if (properties.length === 0) {
      hasMore = false;
      break;
    }

    cursor = properties[properties.length - 1].id;

    for (const property of properties) {
      processedCount++;

      let estimatedEircode = property.eircode ? property.eircode.slice(0, 3).toUpperCase() : estimateRoutingKey(property.address, property.county);
      let estimatedLatitude = null;
      let estimatedLongitude = null;

      if (estimatedEircode && routingKeyCoordinates[estimatedEircode]) {
        estimatedLatitude = routingKeyCoordinates[estimatedEircode].lat;
        estimatedLongitude = routingKeyCoordinates[estimatedEircode].lon;
      }

      if (estimatedEircode || estimatedLatitude || estimatedLongitude) {
        await prisma.propertySale.update({
          where: { id: property.id },
          data: {
            estimatedEircode: estimatedEircode ?? undefined,
            estimatedLatitude: estimatedLatitude ?? undefined,
            estimatedLongitude: estimatedLongitude ?? undefined,
          }
        });
        updatedCount++;
      }

      if (processedCount % 1000 === 0) {
        console.log(`Processed ${processedCount} records, Updated ${updatedCount} records so far...`);
      }
    }
  }

  console.log(`Backfill complete. Processed ${processedCount} total records. Updated ${updatedCount} records.`);
}

main()
  .catch((e) => {
    console.error("Backfill failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
