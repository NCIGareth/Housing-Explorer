import { Suspense } from "react";
import { FilterPanel } from "@/components/filter-panel";
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

export const revalidate = 3600;

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
  const pageSize = 100;

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
            <Suspense fallback={<DashboardChartsSkeleton />}>
              <DashboardChartsSection params={filterParams} />
            </Suspense>
          </div>

          <Suspense fallback={<DashboardMapSkeleton />}>
            <DashboardMapSection params={filterParams} />
          </Suspense>
        </div>

        <Suspense fallback={<DashboardTableSkeleton />}>
          <DashboardTableSection params={filterParams} searchParams={params as Record<string, string>} />
        </Suspense>

        <Suspense fallback={<DashboardTrendSkeleton />}>
          <DashboardTrendSection />
        </Suspense>
      </div>
    </main>
  );
}
