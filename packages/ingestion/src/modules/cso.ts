import { validateHistoricalMetrics } from "../lib/quality";

type CsoMetric = {
  source: string;
  metric: string;
  geography: string;
  period: string;
  value: number;
  unit: string;
};

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

// In production, parse true CSO payloads. For scaffold, we keep a deterministic adapter shape.
export async function fetchCsoMetrics(): Promise<CsoMetric[]> {
  const response = await fetch("https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM06/JSON-stat/2.0/en");
  if (!response.ok) {
    throw new Error(`Failed to fetch CSO JSON-stat API: ${response.status} ${response.statusText}`);
  }
  
  const d = await response.json() as JsonStatResponse;
  const metrics: CsoMetric[] = [];
  
  const statIndex = d.id.indexOf("STATISTIC");
  const timeIndex = d.id.indexOf("TLIST(M1)");
  const geoIndex = d.id.indexOf("C02803V03373");
  
  const getIds = (index: JsonStatResponse["dimension"][string]["category"]["index"]): string[] => Array.isArray(index) ? index : Object.keys(index);
  
  const statIds = getIds(d.dimension.STATISTIC.category.index);
  const timeIds = getIds(d.dimension["TLIST(M1)"].category.index);
  const geoIds = getIds(d.dimension["C02803V03373"].category.index);
  
  let valIdx = 0;
  
  // The flat value array maps identically to nested loops through the dimensions in the order of d.id
  for (const sId of statIds) {
    for (const tId of timeIds) {
      for (const gId of geoIds) {
        const val = d.value[valIdx++];
        
        // We only want the Base Index (HPM06C01), not the percentage changes.
        // We skip null values (which happen heavily for early historical periods).
        if (sId === "HPM06C01" && val !== null) {
          metrics.push({
            source: "CSO_HPM06",
            metric: "RPPI",
            geography: d.dimension["C02803V03373"].category.label[gId],
            period: tId, // Format: YYYYMMDD e.g. "2024M01"
            value: val,
            unit: "index_2015_100"
          });
        }
      }
    }
  }

  return validateHistoricalMetrics(metrics);
}

// Fetches Recorded Crime Incidents by Garda Division (CJA07)
export async function fetchCsoCrimeMetrics(): Promise<CsoMetric[]> {
  const response = await fetch("https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/CJA07/JSON-stat/2.0/en");
  if (!response.ok) {
    throw new Error(`Failed to fetch CSO JSON-stat Crime API: ${response.status} ${response.statusText}`);
  }
  
  const d = await response.json() as JsonStatResponse;
  const metrics: CsoMetric[] = [];
  
  const getIds = (index: JsonStatResponse["dimension"][string]["category"]["index"]): string[] => Array.isArray(index) ? index : Object.keys(index);
  
  const statIds = getIds(d.dimension.STATISTIC.category.index);
  const timeIds = getIds(d.dimension["TLIST(A1)"].category.index);
  const geoIds = getIds(d.dimension["C03037V03742"].category.index);
  const crimeIds = getIds(d.dimension["C02480V03003"].category.index);
  
  let valIdx = 0;
  
  for (const sId of statIds) {
    for (const tId of timeIds) {
      for (const gId of geoIds) {
        for (const cId of crimeIds) {
          const val = d.value[valIdx++];
          
          if (val !== null && val > 0) {
            // We suffix the crime type onto the metric name so they group effectively
            const crimeType = d.dimension["C02480V03003"].category.label[cId];
            metrics.push({
              source: "CSO_CJA07",
              metric: `crime_${crimeType}`,
              geography: d.dimension["C03037V03742"].category.label[gId],
              period: tId, // "2023"
              value: val,
              unit: "incidents"
            });
          }
        }
      }
    }
  }

  return validateHistoricalMetrics(metrics);
}

import type { PrismaClient } from "@housing/db";

export async function upsertCsoMetrics(prisma: PrismaClient, rows: CsoMetric[]) {
  const CHUNK_SIZE = 5000;
  let rowsUpserted = 0;

  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    await prisma.historicalMetric.createMany({ data: chunk, skipDuplicates: true });
    rowsUpserted += chunk.length;
  }

  return { rowsRead: rows.length, rowsUpserted };
}
