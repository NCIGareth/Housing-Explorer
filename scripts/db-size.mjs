import { execSync } from "node:child_process";
import { loadRootEnv } from "./load-root-env.mjs";
loadRootEnv();

const sql = `
SELECT
  relname as table_or_index,
  pg_size_pretty(pg_relation_size(relid)) as size,
  pg_relation_size(relid) as bytes
FROM pg_stat_user_indexes
WHERE relname IN ('PropertySale', 'HistoricalMetric')
   OR indexrelname IN ('PropertySale_address_trgm_idx','PropertySale_eircode_trgm_idx',
                       'PropertySale_address_idx','PropertySale_descriptionOfProperty_idx',
                       'HistoricalMetric_metric_idx')
ORDER BY bytes DESC;
`;
try {
  const r = execSync("npx prisma db execute --stdin", {
    cwd: "packages/db",
    env: { ...process.env },
    encoding: "utf8",
    input: sql,
    shell: true,
    timeout: 15000,
  });
  console.log(r);
} catch (e) {
  console.error(e.stderr || e.message);
}
