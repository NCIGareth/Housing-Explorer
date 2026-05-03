import { resolve } from "node:path";
import * as dotenv from "dotenv";

dotenv.config({ path: resolve(process.cwd(), ".env") });

import { PrismaClient } from "@housing/db";

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.propertySale.count();
  console.log("Total records:", count);
}

main().catch(console.error).finally(() => prisma.$disconnect());
