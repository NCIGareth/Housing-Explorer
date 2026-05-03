import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";

const prisma = new PrismaClient();

async function main() {
  const sample = await prisma.propertySale.findFirst({
    where: { address: { contains: '31 Oldcourt Park Drive', mode: 'insensitive' } }
  });
  console.log(sample);
}

main().catch(console.error).finally(() => prisma.$disconnect());
