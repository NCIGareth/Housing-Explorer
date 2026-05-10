import { Suspense } from "react";
import { FilterPanel } from "@/components/filter-panel";
import { ExportButton } from "@/components/export-button";
import {
  DashboardChartsSection,
  DashboardMapSection,
  DashboardTableSection,
  DashboardTrendSection,
  DashboardChartsSkeleton,
  DashboardMapSkeleton,
  DashboardTableSkeleton,
  DashboardTrendSkeleton,
} from "./dashboard-sections";

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
    page?: string;
    pageSize?: string;
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
  const page = params.page ? Math.max(1, Number(params.page)) : 1;
  const pageSize = Math.min(100, Math.max(10, Number(params.pageSize) || 20));

  const filterParams = {
    county,
    eircode,
    minPriceEur,
    maxPriceEur,
    propertyType,
    startDate,
    endDate,
    locality,
    notFullMarketPrice,
    vatExclusive,
    page,
    pageSize,
  };

  return (
    <main className="max-w-7xl mx-auto p-4 md:p-8 space-y-8 bg-[#fefefe]">
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Market Intelligence Dashboard
        </h1>
        <p className="text-slate-500 text-sm flex items-center gap-2">
          Exploring data for <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold uppercase text-[10px] tracking-wider">{county}</span>
        </p>
      </div>

      <div className="text-center max-w-3xl mx-auto space-y-6">
        <p className="text-xl text-slate-600 leading-relaxed font-medium">
          See what properties really sold for in any Irish area.
        </p>
        <p className="text-sm text-slate-500 leading-relaxed">
          Compare official CSO price indices with actual Property Price Register transactions.
          No asking prices. No estate agent spin. Just recorded sales.
        </p>
        <div className="flex flex-wrap gap-4 justify-center pt-2">
          <a href="#trend-section" className="flex flex-col items-center p-4 bg-blue-50/80 rounded-xl border border-blue-100 w-52 hover:bg-blue-100/80 transition-colors no-underline">
            <span className="text-2xl mb-1">📊</span>
            <span className="text-sm font-semibold text-slate-800">Track Trends</span>
            <span className="text-xs text-slate-500 mt-1 leading-snug">See how prices in your area have changed year-over-year</span>
          </a>
          <a href="#research-section" className="flex flex-col items-center p-4 bg-emerald-50/80 rounded-xl border border-emerald-100 w-52 hover:bg-emerald-100/80 transition-colors no-underline">
            <span className="text-2xl mb-1">🔍</span>
            <span className="text-sm font-semibold text-slate-800">Research a Property</span>
            <span className="text-xs text-slate-500 mt-1 leading-snug">Find sales history, crime stats, and detailed location information</span>
          </a>
          <a href="/compare" className="flex flex-col items-center p-4 bg-amber-50/80 rounded-xl border border-amber-100 w-52 hover:bg-amber-100/80 transition-colors no-underline">
            <span className="text-2xl mb-1">📍</span>
            <span className="text-sm font-semibold text-slate-800">Explore by Area</span>
            <span className="text-xs text-slate-500 mt-1 leading-snug">Compare price trends and CSO indices across different counties</span>
          </a>
        </div>
      </div>

      <div id="research-section" className="grid grid-cols-1 gap-8">
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

        <div className="flex justify-end">
          <Suspense fallback={null}>
            <ExportButton />
          </Suspense>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Suspense fallback={<DashboardChartsSkeleton />}>
              <DashboardChartsSection params={filterParams} />
            </Suspense>
          </div>

          <div id="map-section">
            <Suspense fallback={<DashboardMapSkeleton />}>
              <DashboardMapSection params={filterParams} />
            </Suspense>
          </div>
        </div>

        <Suspense fallback={<DashboardTableSkeleton />}>
          <DashboardTableSection params={filterParams} searchParams={params as Record<string, string>} />
        </Suspense>

        <div id="trend-section">
          <Suspense fallback={<DashboardTrendSkeleton />}>
            <DashboardTrendSection />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
