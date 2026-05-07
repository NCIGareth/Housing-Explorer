import { Suspense } from "react";
import { getCounties, getMultiHistoricalSeries } from "@/lib/queries";
import { CompareForm } from "./compare-form";
import { CompareChart } from "@/components/compare-chart";

type PageProps = {
  searchParams: Promise<{ areas?: string }>;
};

async function CompareChartSection({ areas }: { areas: string }) {
  const selectedAreas = areas.split(",").filter(Boolean);
  if (selectedAreas.length < 2) return null;

  const result = await getMultiHistoricalSeries(selectedAreas);
  return <CompareChart data={result.merged} areas={result.areas} />;
}

function ChartSkeleton() {
  return (
    <div className="h-[460px] bg-slate-50 rounded-xl border border-slate-200 animate-pulse flex items-center justify-center">
      <div className="text-slate-400 text-sm italic">Loading comparison data...</div>
    </div>
  );
}

export default async function ComparePage({ searchParams }: PageProps) {
  const { areas } = await searchParams;
  const selectedAreas = areas ? areas.split(",").filter(Boolean) : [];
  const allCounties = await getCounties();

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Area Comparison</h1>
        <p className="text-sm text-slate-500 mt-1">Compare median price trends across counties</p>
      </div>

      <CompareForm counties={allCounties} selected={selectedAreas} />

      {selectedAreas.length < 2 && (
        <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-xl border border-dashed text-slate-400 italic">
          Select at least 2 areas to compare
        </div>
      )}

      {selectedAreas.length >= 2 && (
        <Suspense fallback={<ChartSkeleton />}>
          <CompareChartSection areas={areas!} />
        </Suspense>
      )}
    </main>
  );
}
