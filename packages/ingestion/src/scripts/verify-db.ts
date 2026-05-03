import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";

const prisma = new PrismaClient();

async function main() {
  const updatedRecords = await prisma.propertySale.findMany({
    where: {
      estimatedEircode: { not: null }
    },
    take: 5
  });

  console.log(`Found ${updatedRecords.length} records with estimatedEircode.`);
  
  for (const record of updatedRecords) {
    console.log(`[${record.county}] ${record.address}`);
    console.log(`   -> Est Eircode: ${record.estimatedEircode}`);
    console.log(`   -> Est Coords: ${record.estimatedLatitude}, ${record.estimatedLongitude}`);
  }

  const count = await prisma.propertySale.count({
    where: { estimatedEircode: { not: null } }
  });
  console.log(`Total estimated records so far: ${count}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
