import { parse } from "csv-parse/sync";
import { validateHistoricalMetrics } from "../lib/quality";
import type { CsoMetric } from "./cso";

/**
 * Central Bank of Ireland Open Data (opendata.centralbank.ie, CKAN, CC-BY-4.0).
 * The raw resource URLs redirect to signed S3 URLs — fetch() follows redirects by default.
 */

// B.2.1 "Retail Interest Rates and Volumes - Loans and Deposits, New Business" — monthly 2003 → present.
const B21_URL =
  "https://opendata.centralbank.ie/dataset/dadd792b-87d1-4b9e-9ce9-8fa6e81a3378/resource/fc4dddc5-c36d-4de0-9605-076d765a0efa/download/b.2.1.csv";

// B.3.1 "Retail Interest Rates - Mortgage Rates" — quarterly 2014Q4 → present, new-business product split with volumes.
const B31_URL =
  "https://opendata.centralbank.ie/dataset/e92c1985-9da0-47e2-af77-c88a3fa37cec/resource/fb07a41b-15f7-4697-a7f7-ce8209d794e5/download/b.3.1.csv";

const USER_AGENT = "IrelandHousingExplorer/1.0 (github.com/NCIGareth/Housing-Explorer)";

async function fetchCsv(url: string): Promise<string[][]> {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    redirect: "follow",
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch CBI CSV (${response.status} ${response.statusText}): ${url}`);
  }
  return parse(await response.text());
}

/** "31/01/2003" -> "2003M01" (matches the RPPI period convention). */
export function toMonthPeriod(date: string): string {
  const [day, month, year] = date.trim().split("/");
  return `${year}M${month}`;
}

/** "31/12/2014" -> "2014Q4". */
export function toQuarterPeriod(date: string): string {
  const [day, month, year] = date.trim().split("/");
  return `${year}Q${Math.ceil(Number(month) / 3)}`;
}

function toNumber(raw: string | undefined): number | null {
  if (raw === undefined || raw === null) return null;
  const cleaned = raw.trim().replace(/[, ]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "..") return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function pushMetric(metrics: CsoMetric[], metric: string, period: string, raw: string | undefined, unit: string) {
  const value = toNumber(raw);
  if (value === null) return;
  metrics.push({
    source: "CBI_B21",
    metric,
    geography: "Ireland",
    period,
    value,
    unit,
  });
}

/**
 * Monthly new-business mortgage interest rates from B.2.1.
 * Column layout (verified 2026-08-08): 0=date, 1=overall, 3=floating & ≤1yr fixation,
 * 5=over 1yr fixation, 7=APRC. The "o/w new lending ex. renegotiations" columns only
 * start in 2014, so the overall rate is the headline series.
 */
export function parseMonthlyRates(rows: string[][]): CsoMetric[] {
  const metrics: CsoMetric[] = [];
  for (const row of rows.slice(1)) {
    const date = row[0]?.trim();
    if (!date) continue;
    const period = toMonthPeriod(date);
    pushMetric(metrics, "mortgage_rate_overall", period, row[1], "pct");
    pushMetric(metrics, "mortgage_rate_floating_le_1y", period, row[3], "pct");
    pushMetric(metrics, "mortgage_rate_over_1y_fixed", period, row[5], "pct");
    pushMetric(metrics, "mortgage_rate_aprc", period, row[7], "pct");
  }
  return metrics;
}

// B.3.1 new-business columns (verified 2026-08-08): rates on new business at 19-27, volumes at 28-36.
const B31_RATES = [
  { col: 23, metric: "mortgage_rate_pdh_floating" },
  { col: 24, metric: "mortgage_rate_pdh_tracker" },
  { col: 25, metric: "mortgage_rate_pdh_fixed_le_1y" },
  { col: 26, metric: "mortgage_rate_pdh_fixed_1_3y" },
  { col: 27, metric: "mortgage_rate_pdh_fixed_over_3y" },
] as const;

const B31_VOLUMES = [
  { col: 32, metric: "mortgage_volume_pdh_floating" },
  { col: 33, metric: "mortgage_volume_pdh_tracker" },
  { col: 34, metric: "mortgage_volume_pdh_fixed_le_1y" },
  { col: 35, metric: "mortgage_volume_pdh_fixed_1_3y" },
  { col: 36, metric: "mortgage_volume_pdh_fixed_over_3y" },
] as const;

/**
 * Quarterly Principal Dwelling House (PDH) new-business mortgage rates and volumes from B.3.1.
 * These power the product-mix chart (fixed vs tracker vs variable share of new lending).
 */
export function parseQuarterlyRates(rows: string[][]): CsoMetric[] {
  const metrics: CsoMetric[] = [];
  for (const row of rows.slice(1)) {
    const date = row[0]?.trim();
    if (!date) continue;
    const period = toQuarterPeriod(date);
    for (const { col, metric } of B31_RATES) {
      const value = toNumber(row[col]);
      if (value === null) continue;
      metrics.push({ source: "CBI_B31", metric, geography: "Ireland", period, value, unit: "pct" });
    }
    for (const { col, metric } of B31_VOLUMES) {
      const value = toNumber(row[col]);
      if (value === null) continue;
      metrics.push({ source: "CBI_B31", metric, geography: "Ireland", period, value, unit: "eur_million" });
    }
  }
  return metrics;
}

export async function fetchCbiMortgageRates(): Promise<CsoMetric[]> {
  const [monthlyRows, quarterlyRows] = await Promise.all([fetchCsv(B21_URL), fetchCsv(B31_URL)]);
  const metrics = [...parseMonthlyRates(monthlyRows), ...parseQuarterlyRates(quarterlyRows)];
  return validateHistoricalMetrics(metrics);
}
