import { PrismaClient, Prisma } from "@prisma/client";

/** Universal check for Next.js build phase */
const isBuildPhase = () => process.env.NEXT_PHASE === "phase-production-build";

/** Lazy-loader for Prisma to prevent initialization crashes during build worker startup */
async function getDb() {
  const { prisma } = await import("./db");
  return prisma as unknown as PrismaClient;
}

/** 
 * Retrieves historical price index metrics for a specific geography.
 * Used primarily for plotting long-term market trends.
 */
export async function getHistoricalSeries(geography: string) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  return prisma.historicalMetric.findMany({
    where: { geography, metric: "residential_price_index" },
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
export async function getLocalCrimeStats(county: string) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();
  
  // We retrieve the latest year available first
  const latestMetric = await prisma.historicalMetric.findFirst({
    where: { metric: { startsWith: "crime_" } },
    orderBy: { period: "desc" }
  });
  
  if (!latestMetric) return [];

  // Group the crime categories across all stations that match the county name in their regional division string
  const grouped = await prisma.historicalMetric.groupBy({
    by: ["metric"],
    _sum: { value: true },
    where: {
      geography: { contains: county, mode: "insensitive" },
      period: latestMetric.period
    },
    orderBy: { _sum: { value: "desc" } }
  });

  return grouped.map((g: { metric: string; _sum: { value: number | null } }) => ({
    category: g.metric.replace("crime_", "").trim(),
    incidents: g._sum.value || 0
  }));
}

/** Monthly median sale price (EUR) from the Property Price Register. Supports filtering. */
export async function getPprMedianPriceByMonth(params: {
  county: string;
  eircode?: string;
  locality?: string;
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
}) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  const whereClauses = [];
  
  // Always filter by county
  whereClauses.push(Prisma.sql`county = ${params.county}`);

  if (params.eircode) {
    whereClauses.push(Prisma.sql`eircode ILIKE ${'%' + params.eircode + '%'}`);
  }

  if (params.locality) {
    whereClauses.push(Prisma.sql`address ILIKE ${'%' + params.locality + '%'}`);
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

type PprFilterParams = {
  county: string;
  eircode?: string;
  locality?: string;
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
};

function buildPprFilterWhere(params: PprFilterParams) {
  const eircodeFilter = params.eircode
    ? { eircode: { contains: params.eircode, mode: "insensitive" as const } }
    : {};

  const localityFilter = params.locality
    ? { address: { contains: params.locality, mode: "insensitive" as const } }
    : {};

  const propertyDescFilter = params.propertyDescription
    ? { descriptionOfProperty: { contains: params.propertyDescription, mode: "insensitive" as const } }
    : {};

  const dateFilter = params.startDate || params.endDate ? {
    saleDate: {
      ...(params.startDate ? { gte: params.startDate } : {}),
      ...(params.endDate ? { lte: params.endDate } : {})
    }
  } : {};

  const marketPriceFilter = params.notFullMarketPrice !== undefined
    ? { notFullMarketPrice: params.notFullMarketPrice }
    : {};

  const vatFilter = params.vatExclusive !== undefined
    ? { vatExclusive: params.vatExclusive }
    : {};

  const priceFilter = (params.minPriceEur !== undefined || params.maxPriceEur !== undefined)
    ? {
        priceEur: {
          ...(params.minPriceEur !== undefined ? { gte: params.minPriceEur } : {}),
          ...(params.maxPriceEur !== undefined ? { lte: params.maxPriceEur } : {}),
        }
      }
    : {};

  return {
    county: params.county,
    ...priceFilter,
    ...eircodeFilter,
    ...localityFilter,
    ...propertyDescFilter,
    ...dateFilter,
    ...marketPriceFilter,
    ...vatFilter,
  };
}

/**
 * Advanced query for fetching recent Property Price Register transactions.
 * Supports filtering by county, eircode substring, price ranges, dates, and market conditions.
 * Ideal for populating the detailed sales table and map points.
 */
export async function getRecentPprSales(params: {
  county: string;
  eircode?: string;
  locality?: string;
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  take?: number;
  skip?: number;
}) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  return prisma.propertySale.findMany({
    where: buildPprFilterWhere(params),
    orderBy: { saleDate: "desc" },
    take: params.take ?? 100,
    skip: params.skip ?? 0
  });
}

/**
 * Counts the total number of Property Price Register transactions matching the filters.
 * Used for pagination calculations.
 */
export async function getPprSalesCount(params: PprFilterParams) {
  if (isBuildPhase()) return 0;
  const prisma = await getDb();

  return prisma.propertySale.count({
    where: buildPprFilterWhere(params)
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
  return counties.map((c: { county: string | null }) => c.county).filter(Boolean) as string[];
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
  return localities.map((l: { address: string | null }) => l.address).filter(Boolean) as string[];
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
  return types.map((t: { descriptionOfProperty: string | null }) => t.descriptionOfProperty).filter(Boolean) as string[];
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

  const stats = result as Array<{
    medianPrice: number | null;
    volume: number | null;
    growthPercent: number | null;
  }>;

  if (!stats || stats.length === 0) return null;
  
  return {
    routingKey,
    medianPrice: stats[0].medianPrice || 0,
    volume: stats[0].volume || 0,
    growthPercent: stats[0].growthPercent
  };
}
