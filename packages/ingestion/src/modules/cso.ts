import { prisma } from "@housing/db";
import { validateHistoricalMetrics } from "../lib/quality";

type CsoMetric = {
  source: string;
  metric: string;
  geography: string;
  period: string;
  value: number;
  unit: string;
};

// In production, parse true CSO payloads. For scaffold, we keep a deterministic adapter shape.
export async function fetchCsoMetrics(): Promise<CsoMetric[]> {
  const response = await fetch("https://ws.cso.ie/public/api.restful/PxStat.Data.Cube_API.ReadDataset/HPM06/JSON-stat/2.0/en");
  if (!response.ok) {
    throw new Error(`Failed to fetch CSO JSON-stat API: ${response.status} ${response.statusText}`);
  }
  
  const d = await response.json() as any;
  const metrics: CsoMetric[] = [];
  
  // JSON-stat format utilizes flat multidimensional arrays. We determine the ordering via d.id
  const statIndex = d.id.indexOf("STATISTIC");
  const timeIndex = d.id.indexOf("TLIST(M1)");
  const geoIndex = d.id.indexOf("C02803V03373");
  
  const getIds = (index: any): string[] => Array.isArray(index) ? index : Object.keys(index);
  
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
  
  const d = await response.json() as any;
  const metrics: CsoMetric[] = [];
  
  const getIds = (index: any): string[] => Array.isArray(index) ? index : Object.keys(index);
  
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

export async function upsertCsoMetrics(rows: CsoMetric[]) {
  // Use Promise.all with chunks for mass insertion
  const CHUNK_SIZE = 500;
  let rowsUpserted = 0;
  
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    const chunk = rows.slice(i, i + CHUNK_SIZE);
    
    // Prisma does not have upsertMany natively, and createMany skips duplicates.
    // Since metric/geography/period is unique, we could delete then insert, but let's just loop or use transactions.
    const ops = chunk.map(doc => prisma.historicalMetric.upsert({
      where: {
        id: `${doc.source}_${doc.geography}_${doc.period}`.replace(/[^a-zA-Z0-9]/g, '_')
      },
      update: { value: doc.value },
      create: {
        id: `${doc.source}_${doc.geography}_${doc.period}`.replace(/[^a-zA-Z0-9]/g, '_'),
        ...doc
      }
    }));
    await prisma.$transaction(ops);
    rowsUpserted += chunk.length;
  }
  
  return { rowsRead: rows.length, rowsUpserted };
}
