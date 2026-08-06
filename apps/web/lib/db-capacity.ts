/**
 * Database capacity (MB) used by /api/health and /api/monitor to compute
 * space-usage percentages and alert when nearing the limit.
 *
 * Both backends are supported:
 *  - Supabase (free tier caps at 500 MB) — default 500 when the URL points
 *    at `.supabase.co`. Raise DB_CAPACITY_MB to the plan size (e.g. 8192 for
 *    Pro) so we squeeze everything we can before pruning retention years.
 *  - Self-hosted PostGIS (Oracle volume) — default 51200 (50 GB boot volume).
 *    Set DB_CAPACITY_MB to the actual volume size.
 */
export function getCapacityMb(): number {
  const fromEnv = Number(process.env.DB_CAPACITY_MB);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return Math.round(fromEnv);

  const url = process.env.DATABASE_URL ?? "";
  return /\.supabase\.co/i.test(url) ? 500 : 51200;
}
