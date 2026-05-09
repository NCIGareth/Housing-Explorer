import { loadRootEnv } from "./load-root-env.mjs";
loadRootEnv();
const { PrismaClient } = await import("../packages/db/node_modules/@prisma/client/index.js");
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DATABASE_URL } } });

const [oldRows] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "PropertySale" WHERE EXTRACT(YEAR FROM "saleDate") <= 2011`);
const [totalRows] = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS c FROM "PropertySale"`);
const [fkCheck] = await prisma.$queryRawUnsafe(`
  SELECT COUNT(*)::int AS c FROM "FavouriteProperty" fp
  JOIN "PropertySale" ps ON ps.id = fp."propertyId"
  WHERE EXTRACT(YEAR FROM ps."saleDate") <= 2011
`);

console.log(`Rows <= 2011: ${oldRows.c}`);
console.log(`Total rows: ${totalRows.c}`);
console.log(`FavouriteProperty referencing old rows: ${fkCheck.c}`);

// Check the saleDate range
const [minMax] = await prisma.$queryRawUnsafe(`SELECT MIN("saleDate")::text AS d, MAX("saleDate")::text AS d2 FROM "PropertySale"`);
console.log(`Sale date range: ${minMax.d} to ${minMax.d2}`);

// DB size
const [dbSize] = await prisma.$queryRawUnsafe(`SELECT pg_size_pretty(pg_database_size(current_database())) AS size`);
console.log(`Database size: ${dbSize.size}`);

await prisma.$disconnect();
