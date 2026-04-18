import { Prisma } from "@prisma/client";
import { prisma } from "./db";


export async function getHistoricalSeries(geography: string) {
  return prisma.historicalMetric.findMany({
    where: { geography, metric: "residential_price_index" },
    orderBy: { period: "asc" }
  });
}

/** Fetches the official CSO Residential Property Price Index timeseries */
export async function getCsoMarketIndex(geography: string = "National - all residential properties") {
  return prisma.historicalMetric.findMany({
    where: { 
      metric: "RPPI",
      geography 
    },
    orderBy: { period: "asc" }
  });
}

/** Aggregates the latest recorded crime statistics for stations within the specified county */
export async function getLocalCrimeStats(county: string, limitRecentPeriods = 1) {
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

  return grouped.map((g: typeof grouped[0]) => ({
    category: g.metric.replace("crime_", "").trim(),
    incidents: g._sum.value || 0
  }));
}

/** Monthly median sale price (EUR) from the Property Price Register. */
export async function getPprMedianPriceByMonth(county: string) {
  return prisma.$queryRaw<Array<{ period: string; value: number }>>(
    Prisma.sql`
      SELECT to_char(date_trunc('month', "saleDate"), 'YYYY-MM') AS period,
             (percentile_cont(0.5) WITHIN GROUP (ORDER BY "priceEur"::float))::float AS value
      FROM "PropertySale"
      WHERE county = ${county}
      GROUP BY date_trunc('month', "saleDate")
      ORDER BY date_trunc('month', "saleDate")
    `
  );
}

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
  const counties = await prisma.propertySale.groupBy({
    by: ["county"],
    orderBy: { county: "asc" }
  });
  return counties.map((c: typeof counties[0]) => c.county).filter(Boolean);
}

/** Get top localities/addresses by transaction count */
export async function getLocalities(county?: string, limit: number = 30) {
  const localities = await prisma.propertySale.groupBy({
    by: ["address"],
    _count: { id: true },
    where: county ? { county } : {},
    orderBy: { _count: { id: "desc" } },
    take: limit
  });
  return localities.map((l: typeof localities[0]) => l.address).filter(Boolean);
}

/** Get property type descriptions */
export async function getPropertyTypes() {
  const types = await prisma.propertySale.groupBy({
    by: ["descriptionOfProperty"],
    _count: { id: true },
    orderBy: { _count: { id: "desc" } }
  });
  return types.map((t: typeof types[0]) => t.descriptionOfProperty).filter(Boolean);
}
/** Get the date of the most recent sale in the database */
export async function getLatestSaleDate() {
  const latest = await prisma.propertySale.findFirst({
    orderBy: { saleDate: "desc" },
    select: { saleDate: true }
  });
  return latest?.saleDate;
}
