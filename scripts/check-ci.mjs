import { loadRootEnv } from "./load-root-env.mjs";
loadRootEnv();
const { PrismaClient } = await import("../packages/db/node_modules/@prisma/client/index.js");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const runs = await prisma.$queryRawUnsafe(
  `SELECT "source", "status", "rowsRead", "rowsUpserted", "startedAt", "finishedAt" FROM "IngestionRun" ORDER BY "startedAt" DESC LIMIT 10`
);
console.table(runs);

// Check if any May 2026 data exists
const mayCount = await prisma.$queryRawUnsafe(
  `SELECT COUNT(*)::int AS c FROM "PropertySale" WHERE EXTRACT(YEAR FROM "saleDate") = 2026 AND EXTRACT(MONTH FROM "saleDate") = 5`
);
console.log(`\nPropertySale rows for May 2026: ${mayCount[0].c}`);

const all2026 = await prisma.$queryRawUnsafe(
  `SELECT COUNT(*)::int AS c FROM "PropertySale" WHERE EXTRACT(YEAR FROM "saleDate") = 2026`
);
console.log(`PropertySale rows for all 2026: ${all2026[0].c}`);

const [dbSize] = await prisma.$queryRawUnsafe(
  `SELECT pg_size_pretty(pg_database_size(current_database())) AS size`
);
console.log(`Database size: ${dbSize.size}`);

await prisma.$disconnect();
