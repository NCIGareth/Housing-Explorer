import { ComparisonCharts } from "@/components/comparison-charts";
import { FilterPanel } from "@/components/filter-panel";
import { PprSalesTable } from "@/components/ppr-sales-table";
import ClientMapView from "@/components/client-map-view";
import {
  getHistoricalSeries,
  getPprMedianPriceByMonth,
  getRecentPprSales,
  getCsoMarketIndex
} from "@/lib/queries";
import { MarketTrendChart } from "@/components/market-trend-chart";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<{
    county?: string;
    eircode?: string;
    minPriceEur?: string;
    maxPriceEur?: string;
    propertyType?: string;
    startDate?: string;
    endDate?: string;
    locality?: string;
    notFullMarketPrice?: string;
    vatExclusive?: string;
  }>;
};

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  
  const county = params.county ?? "Dublin";
  const eircode = params.eircode;
  const minPriceEur = params.minPriceEur ? Number(params.minPriceEur) : undefined;
  const maxPriceEur = params.maxPriceEur ? Number(params.maxPriceEur) : undefined;
  const propertyType = params.propertyType;
  const startDate = params.startDate ? new Date(params.startDate) : undefined;
  const endDate = params.endDate ? new Date(params.endDate) : undefined;
  const locality = params.locality;
  const notFullMarketPrice = params.notFullMarketPrice === "on";
  const vatExclusive = params.vatExclusive === "on";

  // Parallel Data Fetching with graceful error handling for build-time/unreachable DB
  let historical: Awaited<ReturnType<typeof getHistoricalSeries>> = [];
  let pprSeries: Awaited<ReturnType<typeof getPprMedianPriceByMonth>> = [];
  let pprSales: Awaited<ReturnType<typeof getRecentPprSales>> = [];
  let csoNational: Awaited<ReturnType<typeof getCsoMarketIndex>> = [];

  try {
    const results = await Promise.all([
      getHistoricalSeries(county),
      getPprMedianPriceByMonth(county),
      getRecentPprSales({ 
        county, 
        eircode, 
        minPriceEur, 
        maxPriceEur, 
        propertyDescription: propertyType,
        startDate,
        endDate,
        notFullMarketPrice: notFullMarketPrice ? true : undefined,
        vatExclusive: vatExclusive ? true : undefined,
        take: 100 
      }),
      getCsoMarketIndex("National - all residential properties")
    ]);
    [historical, pprSeries, pprSales, csoNational] = results;
  } catch (error) {
    console.warn("Failed to fetch market data during build/render:", error);
  }

  // DATA RECOVERY LOGIC: 
  // If historical (CSO) is empty or only has 1 point, fallback to PPR series
  const useCso = historical && historical.length > 1;
  const rawChartData = useCso ? historical : pprSeries;

  // Explicit casting to ensure Recharts doesn't receive strings
  const chartData = rawChartData.map((d: typeof rawChartData[0]) => ({
    period: d.period,
    value: Number(d.value) || 0
  }));

  const chartSubtitle = useCso
    ? "Showing CSO residential price index (Official Trends)."
    : "Showing median sale price from local PPR records (Real Transactions).";

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-[#fefefe]">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Market Intelligence Dashboard
        </h1>
        <p className="text-slate-500 text-sm flex items-center gap-2">
          Exploring data for <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase text-[10px] tracking-wider">{county}</span>
          <span className="text-slate-300">|</span>
          <span className="font-medium">{pprSales.length} historical records</span>
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <FilterPanel
          county={county}
          eircode={eircode}
          minPriceEur={minPriceEur}
          maxPriceEur={maxPriceEur}
          propertyType={propertyType}
          startDate={params.startDate}
          endDate={params.endDate}
          locality={locality}
          notFullMarketPrice={notFullMarketPrice}
          vatExclusive={vatExclusive}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            {/* If chartData is length 1, Recharts won't draw a line, only a dot */}
            <ComparisonCharts historical={chartData} subtitle={chartSubtitle} />
          </div>
          
          <div className="h-[400px] lg:h-full min-h-[400px] border rounded-xl overflow-hidden shadow-sm">
            <ClientMapView pprPreview={pprSales} />
          </div>
        </div>

        {csoNational.length > 0 && (
          <section className="mt-8">
            <MarketTrendChart data={csoNational} title="National Property Price Inflation" subtitle="CSO RPPI Base Index (100 = 2015)" />
          </section>
        )}

        <section className="space-y-4 pt-4">
          <h2 className="text-lg font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-red-500 rounded-full" /> 
            Recent PPR Transactions
          </h2>
          <div className="max-h-[600px] overflow-y-auto border rounded-xl bg-white shadow-sm">
            <PprSalesTable sales={pprSales} />
          </div>
        </section>
      </div>
    </main>
  );
}