import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { logError, logInfo } from '../lib/logger';
import pLimit from 'p-limit';
import { fetchCountyViewboxes, geocodeRow } from '../lib/geocode';

dotenv.config({ path: resolve(process.cwd(), '../../.env') });
dotenv.config({ path: resolve(process.cwd(), '.env') });

const CONCURRENCY = Number(process.env.GEO_CONCURRENCY ?? 25);
const BATCH_SIZE = 2000;

async function main() {
  const { prisma } = await import('@housing/db');
  const limit = pLimit(CONCURRENCY);
  try {
    const counties = await prisma.$queryRaw<Array<{ county: string }>>`
      SELECT DISTINCT county FROM "PropertySale" WHERE county IS NOT NULL
    `;
    const viewboxes = await fetchCountyViewboxes(counties.map((r) => r.county));
    console.log(`Loaded ${viewboxes.size} county viewboxes.`);

    const totalRes = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*) AS count FROM "PropertySale" WHERE latitude IS NULL
    `;
    const total = Number(totalRes[0]?.count ?? 0);
    console.log(`Re-geocoding ${total} rows without coordinates...`);

    let done = 0;
    let fixed = 0;
    let lastId = "";
    const start = Date.now();

    for (;;) {
      const batch = await prisma.$queryRaw<Array<{ id: string; address: string | null; county: string | null }>>`
        SELECT id, address, county FROM "PropertySale"
        WHERE latitude IS NULL AND id > ${lastId}
        ORDER BY id
        LIMIT ${BATCH_SIZE}
      `;
      if (batch.length === 0) break;

      const results = await Promise.all(batch.map((row) => limit(async () => {
        if (!row.address || !row.county) return false;
        const coords = await geocodeRow(row.address, row.county, viewboxes.get(row.county));
        if (coords.lat && coords.lon) {
          await prisma.propertySale.update({
            where: { id: row.id },
            data: { latitude: coords.lat, longitude: coords.lon },
          });
          return true;
        }
        return false;
      })));

      fixed += results.filter(Boolean).length;
      done += batch.length;
      lastId = batch[batch.length - 1].id;

      const elapsed = (Date.now() - start) / 1000;
      const rate = done / elapsed;
      console.log(`Progress: ${done}/${total} rows, ${fixed} geocoded (${rate.toFixed(0)}/s)`);

      if (batch.length < BATCH_SIZE) break;
    }

    logInfo("regeocode_complete", { processed: done, geocoded: fixed });
  } catch (e) {
    logError("regeocode_failed", { error: String(e) });
    console.error(e);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
