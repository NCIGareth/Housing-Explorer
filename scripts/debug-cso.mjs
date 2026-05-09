import { loadRootEnv } from "./load-root-env.mjs";
loadRootEnv();

const { PrismaClient } = await import("../packages/db/node_modules/@prisma/client/index.js");

async function main() {
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } },
  });

  // Fetch RPPI data
  const response = await fetch("https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM06/JSON-stat/2.0/en");
  const d = await response.json();

  // Debug: show the actual dimension structure
  console.log("=== STATISTIC dimension ===");
  console.log("index:", JSON.stringify(d.dimension.STATISTIC.category.index));
  console.log("label:", JSON.stringify(d.dimension.STATISTIC.category.label));

  console.log("\n=== Geography dimension ===");
  console.log("index (first 5):", JSON.stringify(Object.keys(d.dimension["C02803V03373"].category.index).slice(0, 5)));
  console.log("label (first 3):", JSON.stringify(Object.values(d.dimension["C02803V03373"].category.label).slice(0, 3)));
  const geoLabels = Object.values(d.dimension["C02803V03373"].category.label);
  console.log(`Total geos: ${geoLabels.length}`);

  console.log("\n=== Time dimension ===");
  console.log("index type:", typeof d.dimension["TLIST(M1)"].category.index, Array.isArray(d.dimension["TLIST(M1)"].category.index));
  console.log("index (first 5):", JSON.stringify(d.dimension["TLIST(M1)"].category.index.slice(0, 5)));
  console.log("keys:", JSON.stringify(Object.keys(d.dimension["TLIST(M1)"].category.index).slice(0, 5)));
  console.log("label (first 3):", JSON.stringify(Object.values(d.dimension["TLIST(M1)"].category.label).slice(0, 3)));
  console.log("label keys (first 5):", JSON.stringify(Object.keys(d.dimension["TLIST(M1)"].category.label).slice(0, 5)));

  console.log("\n=== Sample values (first 20) ===");
  console.log(JSON.stringify(d.value.slice(0, 20)));

  // Build a few sample metrics
  const statIndex = d.id.indexOf("STATISTIC");
  const timeIndex = d.id.indexOf("TLIST(M1)");
  const geoIndex = d.id.indexOf("C02803V03373");
  const statIds = Array.isArray(d.dimension.STATISTIC.category.index) ? d.dimension.STATISTIC.category.index : Object.keys(d.dimension.STATISTIC.category.index);
  const timeIds = Array.isArray(d.dimension["TLIST(M1)"].category.index) ? d.dimension["TLIST(M1)"].category.index : Object.keys(d.dimension["TLIST(M1)"].category.index);
  const geoIds = Array.isArray(d.dimension["C02803V03373"].category.index) ? d.dimension["C02803V03373"].category.index : Object.keys(d.dimension["C02803V03373"].category.index);

  let valIdx = 0;
  const samples = [];
  for (const sId of statIds) {
    for (const tId of timeIds) {
      for (const gId of geoIds) {
        const val = d.value[valIdx++];
        if (sId === "HPM06C01" && val !== null) {
          samples.push({
            source: "CSO_HPM06",
            metric: "RPPI",
            geography: d.dimension["C02803V03373"].category.label[gId],
            period: tId,
            value: val,
            unit: "index_2015_100",
          });
          if (samples.length >= 3) break;
        }
      }
      if (samples.length >= 3) break;
    }
    break;
  }

  console.log("\n=== Sample metrics ===");
  for (const s of samples) {
    console.log(JSON.stringify(s));
    console.log(`  value type: ${typeof s.value}, isNaN: ${Number.isNaN(s.value)}, isFinite: ${!Number.isFinite(s.value)}`);
  }

  // Check table structure
  console.log("\n=== HistoricalMetric table structure ===");
  const columns = await prisma.$queryRawUnsafe(`
    SELECT column_name, data_type, is_nullable, column_default
    FROM information_schema.columns
    WHERE table_name = 'HistoricalMetric'
    ORDER BY ordinal_position
  `);
  for (const c of columns) {
    console.log(`  ${c.column_name.padEnd(20)} ${c.data_type.padEnd(15)} nullable=${c.is_nullable} default=${c.column_default || 'none'}`);
  }

  // Check _prisma_migrations for our migration
  const migs = await prisma.$queryRawUnsafe(`
    SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at
  `);
  console.log("\n=== _prisma_migrations ===");
  for (const m of migs) {
    console.log(`  ${m.migration_name}`);
  }

  // Try createMany with a small batch
  console.log("\n=== Testing createMany ===");
  try {
    const data = samples.map(s => ({
      id: `${s.source}_${s.metric}_${s.geography}_${s.period}`.replace(/[^a-zA-Z0-9]/g, '_'),
      ...s,
    }));
    console.log("sample data:", JSON.stringify(data, null, 2));
    const result = await prisma.historicalMetric.createMany({
      data,
      skipDuplicates: true,
    });
    console.log("createMany succeeded:", result);
  } catch (e) {
    console.error("createMany failed:", e.message || e);
    console.error("code:", e.code);
    console.error("meta:", JSON.stringify(e.meta));
  }

  await prisma.$disconnect();
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
