import { ComparisonCharts } from "@/components/comparison-charts";
import ClientMapView from "@/components/client-map-view";
import { MarketTrendChart } from "@/components/market-trend-chart";
import { PprSalesTable } from "@/components/ppr-sales-table";
import {
  getHistoricalSeries,
  getPprMedianPriceByMonth,
  getRecentPprSales,
  getPprSaleCount,
  getCsoMarketIndex,
} from "@/lib/queries";

type FilterParams = {
  counties: string[];
  eircodes?: string[];
  localities?: string[];
  minPriceEur?: number;
  maxPriceEur?: number;
  propertyType?: string;
  startDate?: Date;
  endDate?: Date;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  page: number;
  pageSize: number;
};

function buildQueryParams(p: FilterParams) {
  return {
    counties: p.counties,
    eircodes: p.eircodes,
    localities: p.localities,
    minPriceEur: p.minPriceEur,
    maxPriceEur: p.maxPriceEur,
    propertyDescription: p.propertyType,
    startDate: p.startDate,
    endDate: p.endDate,
    notFullMarketPrice: p.notFullMarketPrice ? true : undefined,
    vatExclusive: p.vatExclusive ? true : undefined,
  };
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
  );
}

function SectionError({ children }: { children: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
      {children}
    </div>
  );
}

export async function DashboardChartsSection({ params }: { params: FilterParams }) {
  const qp = buildQueryParams(params);

  let historical: Awaited<ReturnType<typeof getHistoricalSeries>> = [];
  let pprSeries: Awaited<ReturnType<typeof getPprMedianPriceByMonth>> = [];
  let error = false;

  try {
    const singleCounty = params.counties.length === 1 ? params.counties[0] : null;
    historical = singleCounty ? await getHistoricalSeries(singleCounty) : [];
    const useCso = historical && historical.length > 1;
    if (!useCso) {
      pprSeries = await getPprMedianPriceByMonth(qp);
    }
  } catch (e) {
    error = true;
    console.error("Failed to fetch chart data:", e);
  }

  if (error) {
    return <SectionError>Couldn&apos;t load price trends — please try again.</SectionError>;
  }

  const chartValid = historical && historical.length > 1;
  const rawChartData = chartValid ? historical : pprSeries;
  const chartData = rawChartData.map((d) => ({
    period: d.period,
    value: Number(d.value) || 0,
  }));
  const subtitle = chartValid
    ? "Showing CSO residential price index (Official Trends)."
    : "Showing median sale price from local Property Price Register data.";

  return <ComparisonCharts historical={chartData} subtitle={subtitle} />;
}

export async function DashboardMapSection({ params }: { params: FilterParams }) {
  const qp = buildQueryParams(params);

  let pprSales: Awaited<ReturnType<typeof getRecentPprSales>> = [];
  let error = false;

  try {
    pprSales = await getRecentPprSales({
      ...qp,
      take: params.pageSize + 1,
      skip: (params.page - 1) * params.pageSize,
    });
    pprSales = pprSales.slice(0, params.pageSize);
  } catch (e) {
    error = true;
    console.error("Failed to fetch map data:", e);
  }

  if (error) {
    return <SectionError>Couldn&apos;t load the map — please try again.</SectionError>;
  }

  return (
    <div className="h-[400px] lg:h-full min-h-[400px] border rounded-xl overflow-hidden shadow-sm">
      <ClientMapView pprPreview={pprSales} />
    </div>
  );
}

export async function DashboardTableSection({ params, searchParams }: { params: FilterParams; searchParams: Record<string, string | string[] | undefined> }) {
  const qp = buildQueryParams(params);

  let pprSales: Awaited<ReturnType<typeof getRecentPprSales>> = [];
  let hasNextPage = false;
  let totalCount = 0;
  let error = false;

  try {
    pprSales = await getRecentPprSales({
      ...qp,
      take: params.pageSize + 1,
      skip: (params.page - 1) * params.pageSize,
    });
    if (pprSales.length > params.pageSize) {
      hasNextPage = true;
      pprSales = pprSales.slice(0, params.pageSize);
    }
  } catch (e) {
    error = true;
    console.error("Failed to fetch table data:", e);
  }

  try {
    totalCount = await getPprSaleCount(qp);
  } catch (e) {
    console.error("Failed to fetch total count:", e);
  }

  return (
    <section className="space-y-4 pt-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="w-2 h-2 bg-red-500 rounded-full" />
        Recent PPR Transactions
      </h2>
      <div className="border rounded-xl bg-white shadow-sm">
        {error ? (
          <SectionError>Couldn&apos;t load sales data — please try again.</SectionError>
        ) : (
          <PprSalesTable
            sales={pprSales}
            currentPage={params.page}
            pageSize={params.pageSize}
            hasNextPage={hasNextPage}
            totalCount={totalCount}
            searchParams={searchParams}
          />
        )}
      </div>
    </section>
  );
}

export async function DashboardTrendSection() {
  let csoNational: Awaited<ReturnType<typeof getCsoMarketIndex>> = [];

  try {
    csoNational = await getCsoMarketIndex("National - all residential properties");
  } catch (error) {
    console.error("Failed to fetch trend data:", error);
  }

  if (!csoNational.length) {
    return (
      <section className="mt-8">
        <MarketTrendChart data={[]} title="National Property Price Inflation" subtitle="CSO RPPI Base Index (100 = 2015)" />
      </section>
    );
  }

  return (
    <section className="mt-8">
      <MarketTrendChart data={csoNational} title="National Property Price Inflation" subtitle="CSO RPPI Base Index (100 = 2015)" />
    </section>
  );
}

export function DashboardChartsSkeleton() {
  return <Skeleton className="h-[400px]" />;
}

export function DashboardMapSkeleton() {
  return <Skeleton className="h-[400px] min-h-[400px]" />;
}

export function DashboardTableSkeleton() {
  return (
    <section className="space-y-4 pt-4">
      <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
      <Skeleton className="h-[500px]" />
    </section>
  );
}

export function DashboardTrendSkeleton() {
  return <Skeleton className="h-[300px] mt-8" />;
}
