import { loadRootEnv } from "./load-root-env.mjs";
loadRootEnv();
const { PrismaClient } = await import("../packages/db/node_modules/@prisma/client/index.js");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const [dbSize] = await prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`);
console.log(`DB size: ${dbSize.size}`);

const perYear = await prisma.$queryRawUnsafe(
  `SELECT EXTRACT(YEAR FROM "saleDate")::int AS year, COUNT(*)::int AS count, COUNT(*)::int * 433 / 1000000 AS est_mb FROM "PropertySale" GROUP BY year ORDER BY year`
);
console.log("\nRows per year:");
let totalRows = 0;
for (const r of perYear) {
  totalRows += r.count;
  console.log(`  ${r.year}: ${r.count.toLocaleString().padStart(7)} ~${r.est_mb} MB`);
}
console.log(`Total rows: ${totalRows.toLocaleString()}`);

// Biggest indexes
const idxs = await prisma.$queryRawUnsafe(
  `SELECT indexname::text, pg_size_pretty(pg_relation_size(indexrelid)) AS size, pg_relation_size(indexrelid) AS bytes FROM pg_stat_user_indexes ORDER BY bytes DESC LIMIT 10`
);
console.log("\nLargest indexes:");
for (const i of idxs) {
  console.log(`  ${i.indexname.padEnd(50)} ${i.size}`);
}

await prisma.$disconnect();
