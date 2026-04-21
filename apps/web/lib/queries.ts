import { PrismaClient } from "@prisma/client";

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

/** Monthly median sale price (EUR) from the Property Price Register. */
export async function getPprMedianPriceByMonth(county: string) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  const result = await prisma.$queryRaw`
      SELECT to_char(date_trunc('month', "saleDate"), 'YYYY-MM') AS period,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float AS value
      FROM "PropertySale"
      WHERE county = ${county}
      GROUP BY date_trunc('month', "saleDate")
      ORDER BY date_trunc('month', "saleDate")
  `;
  return result as Array<{ period: string; value: number }>;
}

/**
 * Advanced query for fetching recent Property Price Register transactions.
 * Supports filtering by county, eircode substring, price ranges, dates, and market conditions.
 * Ideal for populating the detailed sales table and map points.
 */
export async function getRecentPprSales(params: {
  county: string;
  eircode?: string;
  minPriceEur?: number;
  maxPriceEur?: number;
  startDate?: Date;
  endDate?: Date;
  propertyDescription?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  take?: number;
}) {
  if (isBuildPhase()) return [];
  const prisma = await getDb();

  const eircodeFilter = params.eircode
    ? { eircode: { contains: params.eircode, mode: 'insensitive' as const } }
    : {};

  const propertyDescFilter = params.propertyDescription
    ? { descriptionOfProperty: { contains: params.propertyDescription, mode: 'insensitive' as const } }
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

  return prisma.propertySale.findMany({
    where: {
      county: params.county,
      priceEur: {
        gte: params.minPriceEur,
        lte: params.maxPriceEur
      },
      ...eircodeFilter,
      ...propertyDescFilter,
      ...dateFilter,
      ...marketPriceFilter,
      ...vatFilter
    },
    orderBy: { saleDate: "desc" },
    take: params.take ?? 100
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
