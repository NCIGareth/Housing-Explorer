import { validateHistoricalMetrics } from "../lib/quality";
import type { CsoMetric } from "./cso";

type JsonStatResponse = {
  id: string[];
  value: number[];
  dimension: Record<string, {
    category: {
      index: Record<string, number> | string[];
      label: Record<string, string>;
    };
  }>;
};

/**
 * CSO RAA02 — "Estimates of Household Income by County".
 * Annual 2000-2024, 26 counties + Ireland.
 * Dimension order: STATISTIC | TLIST(A1) | C03788V04538.
 */
const RAA02_URL = "https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/RAA02/JSON-stat/2.0/en";

// Only the statistics we actually surface on the affordability page.
const RAA02_STATS: Record<string, { metric: string; unit: string }> = {
  RAA02C08: { metric: "income_total_person", unit: "EUR" },
  RAA02C12: { metric: "income_disposable_person", unit: "EUR" },
  RAA02C13: { metric: "income_disposable_person_index", unit: "index_2000_100" },
  RAA02C17: { metric: "persons_at_work", unit: "persons_000s" },
  RAA02C18: { metric: "persons_at_work_pct", unit: "pct" },
};

// RAA02 labels geographies as "Co. Carlow", "Co. Dublin" etc. (except "Ireland"),
// which do not match PPR's plain county names — strip the prefix.
export function normalizeCountyLabel(label: string): string {
  if (label === "Ireland") return "Ireland";
  return label.replace(/^Co\.\s*/i, "").trim();
}

export async function fetchCsoIncomeMetrics(): Promise<CsoMetric[]> {
  const response = await fetch(RAA02_URL, {
    headers: { "User-Agent": "IrelandHousingExplorer/1.0 (github.com/NCIGareth/Housing-Explorer)" },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch CSO RAA02 JSON-stat API: ${response.status} ${response.statusText}`);
  }

  const d = await response.json() as JsonStatResponse;
  const metrics: CsoMetric[] = [];

  const getIds = (index: JsonStatResponse["dimension"][string]["category"]["index"]): string[] =>
    Array.isArray(index) ? index : Object.keys(index);

  const statIds = getIds(d.dimension.STATISTIC.category.index);
  const timeIds = getIds(d.dimension["TLIST(A1)"].category.index);
  const geoIds = getIds(d.dimension["C03788V04538"].category.index);
  const geoLabels = d.dimension["C03788V04538"].category.label;

  let valIdx = 0;

  // The flat value array maps identically to nested loops through the dimensions in the order of d.id.
  for (const sId of statIds) {
    const stat = RAA02_STATS[sId];
    for (const tId of timeIds) {
      for (const gId of geoIds) {
        const val = d.value[valIdx++];
        if (!stat || val === null) continue;
        metrics.push({
          source: "CSO_RAA02",
          metric: stat.metric,
          geography: normalizeCountyLabel(geoLabels[gId]),
          period: tId, // Format: "2024"
          value: val,
          unit: stat.unit,
        });
      }
    }
  }

  return validateHistoricalMetrics(metrics);
}
