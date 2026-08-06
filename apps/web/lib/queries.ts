import { Prisma } from "@prisma/client";
import { isEircodeKey } from "./area";

/** Universal check for Next.js build phase */
const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";

/** Lazy-loader for Prisma to prevent initialization crashes during build worker startup */
async function getDb() {
  const { prisma } = await import("./db");
  return prisma;
}

/** 
 * Retrieves historical price index metrics for a specific geography.
 * Used primarily for plotting long-term market trends.
 */
export async function getHistoricalSeries(geography: string) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  return prisma.historicalMetric.findMany({
    where: { geography, metric: "RPPI" },
    orderBy: { period: "asc" }
  });
}

/** Fetches the official CSO Residential Property Price Index timeseries */
export async function getCsoMarketIndex(geography: string = "National - all residential properties") {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  return prisma.historicalMetric.findMany({
    where: { 
      metric: "RPPI",
      geography 
    },
    orderBy: { period: "asc" }
  });
}

/** Aggregates the latest recorded crime statistics for stations within the specified county */
export async function getLocalCrimeStats(county: string, locality?: string) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  
  // We retrieve the latest year available first
  const latestMetric = await prisma.historicalMetric.findFirst({
    where: { metric: { startsWith: "crime_" } },
    orderBy: { period: "desc" }
  });
  
  if (!latestMetric) return [];

  // Build geography filter: include Garda division stations for the given county
  const geoConditions: Array<{ contains: string; mode: "insensitive" }> = [
    { contains: county, mode: "insensitive" },
  ];
  // Dublin stations use D.M.R. (Dublin Metropolitan Region) naming rather than "Dublin"
  if (county.toLowerCase() === "dublin") {
    geoConditions.push({ contains: "D.M.R.", mode: "insensitive" });
  }

  // If locality provided, narrow to stations serving that area
  let where: Prisma.HistoricalMetricWhereInput;
  if (locality) {
    where = {
      geography: { contains: locality, mode: "insensitive" },
      period: latestMetric.period,
    };
  } else {
    where = {
      OR: geoConditions.map((c) => ({ geography: c })),
      period: latestMetric.period,
    };
  }

  // Group the crime categories across all matching stations
    const grouped = await prisma.historicalMetric.groupBy({
    by: ["metric"],
    _sum: { value: true },
    where,
    orderBy: { _sum: { value: "desc" } }
  });

  return grouped.map((g) => ({
    category: g.metric.replace("crime_", "").trim(),
    incidents: g._sum.value || 0
  }));
}

/** Median monthly sale price (EUR) from the Property Price Register. Supports filtering. */
export async function getPprMedianPriceByMonth(params: {
  counties: string[];
  eircodes?: string[];
  localities?: string[];
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  housingType?: "house" | "apartment";
}) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  // Use pre-computed cache when a single county and no additional filters are applied
  const useCache = params.counties.length === 1 && !params.eircodes?.length &&
    !params.localities?.length && !params.propertyDescription &&
    !params.startDate && !params.endDate && params.minPriceEur === undefined &&
    params.maxPriceEur === undefined && params.notFullMarketPrice === undefined &&
    params.vatExclusive === undefined && params.housingType === undefined;

  if (useCache) {
    const cached = await prisma.medianPriceCache.findMany({
      where: { county: params.counties[0] },
      orderBy: { period: "asc" },
      select: { period: true, value: true },
    });
    if (cached.length > 0) {
      return cached.map((c) => ({ period: c.period, value: c.value }));
    }
  }

  const whereClauses = [];
  
  if (params.counties.length > 0) {
    whereClauses.push(Prisma.sql`county = ANY(${params.counties})`);
  }

  if (params.eircodes && params.eircodes.length > 0) {
    whereClauses.push(Prisma.sql`SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) = ANY(${params.eircodes})`);
  }

  if (params.localities && params.localities.length > 0) {
    whereClauses.push(Prisma.sql`address ILIKE ANY(${params.localities.map((l) => `%${l}%`)})`);
  }

  if (params.propertyDescription) {
    whereClauses.push(Prisma.sql`"descriptionOfProperty" ILIKE ${'%' + params.propertyDescription + '%'}`);
  }

  if (params.startDate) {
    whereClauses.push(Prisma.sql`"saleDate" >= ${params.startDate}`);
  }

  if (params.endDate) {
    whereClauses.push(Prisma.sql`"saleDate" <= ${params.endDate}`);
  }

  if (params.minPriceEur !== undefined) {
    whereClauses.push(Prisma.sql`"priceEur" >= ${params.minPriceEur}`);
  }

  if (params.maxPriceEur !== undefined) {
    whereClauses.push(Prisma.sql`"priceEur" <= ${params.maxPriceEur}`);
  }

  if (params.notFullMarketPrice !== undefined) {
    whereClauses.push(Prisma.sql`"notFullMarketPrice" = ${params.notFullMarketPrice}`);
  }

  if (params.vatExclusive !== undefined) {
    whereClauses.push(Prisma.sql`"vatExclusive" = ${params.vatExclusive}`);
  }

  if (params.housingType === "apartment") {
    whereClauses.push(Prisma.sql`"isApartment" = true`);
  } else if (params.housingType === "house") {
    whereClauses.push(Prisma.sql`"isApartment" = false`);
  }

  const where = Prisma.sql`WHERE ${Prisma.join(whereClauses, ' AND ')}`;

  const result = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', "saleDate"), 'YYYY-MM') AS period,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float AS value
      FROM "PropertySale"
      ${where}
      GROUP BY date_trunc('month', "saleDate")
      ORDER BY date_trunc('month', "saleDate")
  `;
  return result as Array<{ period: string; value: number }>;
}

export type PprFilterParams = {
  counties: string[];
  eircodes?: string[];
  localities?: string[];
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  housingType?: "house" | "apartment";
};

export function buildPprFilterWhere(params: PprFilterParams) {
  const conditions: Prisma.PropertySaleWhereInput[] = [];

  if (params.counties.length > 0) {
    conditions.push({ county: { in: params.counties } });
  }

  if (params.eircodes && params.eircodes.length > 0) {
    conditions.push({
      OR: params.eircodes.map((e) => ({
        OR: [
          { eircode: { startsWith: e, mode: "insensitive" as const } },
          { estimatedEircode: { startsWith: e, mode: "insensitive" as const } },
        ],
      })),
    });
  }

  if (params.localities && params.localities.length > 0) {
    conditions.push({
      OR: params.localities.map((l) => ({
        address: { contains: l, mode: "insensitive" as const },
      })),
    });
  }

  if (params.propertyDescription) {
    conditions.push({
      descriptionOfProperty: { contains: params.propertyDescription, mode: "insensitive" as const },
    });
  }

  if (params.housingType === "apartment") {
    conditions.push({ isApartment: true });
  } else if (params.housingType === "house") {
    conditions.push({ isApartment: false });
  }

  if (params.startDate || params.endDate) {
    conditions.push({
      saleDate: {
        ...(params.startDate ? { gte: params.startDate } : {}),
        ...(params.endDate ? { lte: params.endDate } : {})
      }
    });
  }

  if (params.notFullMarketPrice !== undefined) {
    conditions.push({ notFullMarketPrice: params.notFullMarketPrice });
  }

  if (params.vatExclusive !== undefined) {
    conditions.push({ vatExclusive: params.vatExclusive });
  }

  if (params.minPriceEur !== undefined || params.maxPriceEur !== undefined) {
    conditions.push({
      priceEur: {
        ...(params.minPriceEur !== undefined ? { gte: params.minPriceEur } : {}),
        ...(params.maxPriceEur !== undefined ? { lte: params.maxPriceEur } : {}),
      }
    });
  }

  return conditions.length > 0 ? { AND: conditions } : {};
}



function getCacheKey(params: Record<string, unknown>): string {
  const ordered: Record<string, unknown> = {};
  for (const key of Object.keys(params).sort()) {
    const v = params[key];
    if (v !== undefined) ordered[key] = v;
  }
  return JSON.stringify(ordered);
}

const pprSalesCache = new Map<string, Promise<Prisma.PropertySaleGetPayload<object>[]>>();
const PPR_CACHE_MAX = 50;
const pprCacheKeys: string[] = [];

type PprSalesParams = {
  counties: string[];
  eircodes?: string[];
  localities?: string[];
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  housingType?: "house" | "apartment";
  take?: number;
  skip?: number;
};

/**
 * Fetches the most recent Property Price Register transactions matching the given filters.
 * Ideal for populating the detailed sales table and map points.
 */
export async function getRecentPprSales(params: PprSalesParams) {
  if (isBuildPhase()) return [];

  const key = getCacheKey(params as Record<string, unknown>);
  const existing = pprSalesCache.get(key);
  if (existing) return existing;

  const prisma = await getDb();
  const promise = prisma.propertySale.findMany({
    where: buildPprFilterWhere(params),
    orderBy: { saleDate: "desc" },
    take: params.take ?? 100,
    skip: params.skip ?? 0,
  });

  pprSalesCache.set(key, promise);
  pprCacheKeys.push(key);

  if (pprCacheKeys.length > PPR_CACHE_MAX) {
    const stale = pprCacheKeys.shift();
    if (stale) pprSalesCache.delete(stale);
  }

  return promise;
}

/** Counts PPR transactions matching the given filters (ignores take/skip). */
export async function getPprSaleCount(params: PprFilterParams) {
  if (isBuildPhase()) return 0;
  const prisma = await getDb();
  return prisma.propertySale.count({
    where: buildPprFilterWhere(params),
  });
}

/** Get all counties with sales data */
export async function getCounties() {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  const counties = await prisma.propertySale.groupBy({
    by: ["county"],
    orderBy: { county: "asc" }
  });
  return counties.map((c) => c.county).filter(Boolean) as string[];
}

/** Get top localities/addresses by transaction count */
export async function getLocalities(county?: string, limit: number = 30) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  const localities = await prisma.propertySale.groupBy({
    by: ["address"],
    _count: { id: true },
    where: county ? { county } : {},
    orderBy: { _count: { id: "desc" } },
    take: limit
  });
  return localities.map((l) => l.address).filter(Boolean) as string[];
}

/** Get property type descriptions */
export async function getPropertyTypes() {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  const types = await prisma.propertySale.groupBy({
    by: ["descriptionOfProperty"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } }
  });
  return types.map((t) => t.descriptionOfProperty).filter(Boolean) as string[];
}

/** Get the date of the most recent sale in the database */
export async function getLatestSaleDate() {
  if (isBuildPhase()) return null;
  const prisma = await getDb();
  const latest = await prisma.propertySale.findFirst({
    orderBy: { saleDate: "desc" },
    select: { saleDate: true }
  });
  return latest?.saleDate;
}

/** 
 * Fetches a single property sale record by its unique database ID.
 * Returns null if the property is not found or during the build phase.
 */
export async function getPropertyById(id: string) {
  if (isBuildPhase()) return null;
  const prisma = await getDb();
  return prisma.propertySale.findUnique({
    where: { id }
  });
}

/** 
 * Aggregates property sales by Eircode Routing Key (first 3 chars).
 * Calculates median price, volume, and 12-month growth.
 */
export async function getEircodeRoutingKeyStats(params: {
  county: string;
  limit?: number;
}) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  // We use both eircode and estimatedEircode to maximize coverage
  const result = await prisma.$queryRaw`
    WITH current_year AS (
      SELECT 
        SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) as routing_key,
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float as median_price,
        COUNT(*)::int as volume
      FROM "PropertySale"
      WHERE county = ${params.county}
        AND "saleDate" >= NOW() - INTERVAL '1 year'
        AND (eircode IS NOT NULL OR "estimatedEircode" IS NOT NULL)
      GROUP BY 1
    ),
    previous_year AS (
      SELECT 
        SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) as routing_key,
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float as median_price
      FROM "PropertySale"
      WHERE county = ${params.county}
        AND "saleDate" >= NOW() - INTERVAL '2 years'
        AND "saleDate" < NOW() - INTERVAL '1 year'
        AND (eircode IS NOT NULL OR "estimatedEircode" IS NOT NULL)
      GROUP BY 1
    )
    SELECT 
      curr.routing_key as "routingKey",
      curr.median_price as "medianPrice",
      curr.volume,
      CASE 
        WHEN prev.median_price > 0 THEN ((curr.median_price - prev.median_price) / prev.median_price) * 100
        ELSE NULL
      END as "growthPercent"
    FROM current_year curr
    LEFT JOIN previous_year prev ON curr.routing_key = prev.routing_key
    WHERE curr.routing_key IS NOT NULL AND curr.routing_key != ''
    ORDER BY curr.volume DESC
    LIMIT ${params.limit ?? 20}
  `;

  return result as Array<{
    routingKey: string;
    medianPrice: number;
    volume: number;
    growthPercent: number | null;
  }>;
}

type SingleEircodeStatsResult = {
  medianPrice: number | null;
  volume: number | null;
  growthPercent: number | null;
};

type SearchResultRow = {
  id: string;
  address: string;
  county: string;
  eircode: string | null;
  priceEur: number;
  saleDate: Date;
};

/** 
 * Fetches analytics for a single Eircode Routing Key.
 */
export async function getSingleEircodeRoutingKeyStats(routingKey: string, county: string) {
  if (isBuildPhase()) return null;
  const prisma = await getDb();

  const result = await prisma.$queryRaw`
    WITH current_year AS (
      SELECT 
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float as median_price,
        COUNT(*)::int as volume
      FROM "PropertySale"
      WHERE county = ${county}
        AND SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) = ${routingKey}
        AND "saleDate" >= NOW() - INTERVAL '1 year'
    ),
    previous_year AS (
      SELECT 
        (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float as median_price
      FROM "PropertySale"
      WHERE county = ${county}
        AND SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) = ${routingKey}
        AND "saleDate" >= NOW() - INTERVAL '2 years'
        AND "saleDate" < NOW() - INTERVAL '1 year'
    )
    SELECT 
      curr.median_price as "medianPrice",
      curr.volume,
      CASE 
        WHEN prev.median_price > 0 THEN ((curr.median_price - prev.median_price) / prev.median_price) * 100
        ELSE NULL
      END as "growthPercent"
    FROM current_year curr, previous_year prev
  `;

  const stats = result as Array<SingleEircodeStatsResult>;

  if (!stats || stats.length === 0) return null;

  return {
    routingKey,
    medianPrice: stats[0].medianPrice || 0,
    volume: stats[0].volume || 0,
    growthPercent: stats[0].growthPercent
  };
}

type PeriodSeries = Array<{ period: string; value: number }>;

/** Merges one time series per area into rows keyed by period (missing periods stay undefined). */
export function mergeSeriesByPeriod(rowsPerArea: PeriodSeries[], areas: string[]) {
  const periodMap: Record<string, Record<string, number>> = {};
  for (let i = 0; i < areas.length; i++) {
    const key = areas[i].replace(/\s+/g, "_");
    for (const row of rowsPerArea[i]) {
      if (!periodMap[row.period]) periodMap[row.period] = {};
      periodMap[row.period][key] = Number(row.value);
    }
  }

  return Object.entries(periodMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, values]) => ({ period, ...values }));
}

export async function getMultiHistoricalSeries(areas: string[]) {
  if (isBuildPhase()) return { merged: [], areas: [] };
  if (areas.length === 0) return { merged: [], areas: [] };
  const prisma = await getDb();

  const csoResults = await Promise.all(
    areas.map((area) =>
      prisma.historicalMetric.findMany({
        where: { geography: area, metric: "RPPI" },
        orderBy: { period: "asc" },
      })
    )
  );

  const pprFallbacks: Promise<PeriodSeries>[] = [];
  for (let i = 0; i < areas.length; i++) {
    if (csoResults[i].length === 0) {
      pprFallbacks.push(getPprMedianPriceByMonth({ counties: [areas[i]] }));
    } else {
      pprFallbacks.push(Promise.resolve([]));
    }
  }

  const pprResults = await Promise.all(pprFallbacks);

  const rowsPerArea = csoResults.map((rows, i) => (rows.length > 0 ? rows : pprResults[i]));

  return { merged: mergeSeriesByPeriod(rowsPerArea, areas), areas };
}

/**
 * Quarterly PPR median sale price (EUR) per area.
 * Areas may be county names or eircode routing keys (e.g. "D20", "A94") —
 * routing keys are matched against eircode / estimated eircode prefixes.
 */
export async function getMultiMedianSeries(areas: string[]) {
  if (isBuildPhase()) return { merged: [], areas: [] };
  if (areas.length === 0) return { merged: [], areas: [] };
  const prisma = await getDb();

  const results = await Promise.all(
    areas.map((area) => {
      const filter = isEircodeKey(area)
        ? Prisma.sql`SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) = ${area}`
        : Prisma.sql`county = ${area}`;
      return prisma.$queryRaw<PeriodSeries>`
        SELECT to_char(date_trunc('quarter', "saleDate"), 'YYYY-MM') AS period,
               (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float AS value
        FROM "PropertySale"
        WHERE ${filter}
        GROUP BY date_trunc('quarter', "saleDate")
        ORDER BY date_trunc('quarter', "saleDate")
      `;
    })
  );

  return { merged: mergeSeriesByPeriod(results, areas), areas };
}

export type SearchResult = {
  id: string;
  address: string;
  county: string;
  eircode: string | null;
  priceEur: number;
  saleDate: Date;
};

export async function getSimilarProperties(address: string, county: string, excludeId: string, limit = 12) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  const streetAddress = address.replace(/^\d+\s*/, "").trim();

  return prisma.propertySale.findMany({
    where: {
      county,
      address: { contains: streetAddress, mode: "insensitive" },
      id: { not: excludeId },
    },
    orderBy: { saleDate: "desc" },
    take: limit,
    select: {
      id: true,
      address: true,
      priceEur: true,
      saleDate: true,
      descriptionOfProperty: true,
      county: true,
      eircode: true,
      estimatedEircode: true,
      latitude: true,
      longitude: true,
      estimatedLatitude: true,
      estimatedLongitude: true,
      coordinateConfidence: true,
      coordinateErrorMeters: true,
    },
  });
}

export async function searchProperties(query: string, limit = 20) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  const results = await prisma.$queryRaw`
    SELECT id, address, county, eircode, "priceEur", "saleDate"
    FROM "PropertySale"
    WHERE address ILIKE ${'%' + query + '%'}
       OR eircode ILIKE ${'%' + query + '%'}
       OR "estimatedEircode" ILIKE ${'%' + query + '%'}
    ORDER BY "saleDate" DESC
    LIMIT ${limit}
  `;

  return results as Array<SearchResultRow>;
}
