import { getCounties, getMultiHistoricalSeries } from "@/lib/queries";
import { CompareForm } from "./compare-form";
import { CompareChart } from "@/components/compare-chart";

type PageProps = {
  searchParams: Promise<{ areas?: string }>;
};

export default async function ComparePage({ searchParams }: PageProps) {
  const { areas } = await searchParams;
  const selectedAreas = areas ? areas.split(",").filter(Boolean) : [];
  const allCounties = await getCounties();

  let chartData: Array<Record<string, string | number>> = [];
  let chartAreas: string[] = [];

  if (selectedAreas.length >= 2) {
    const result = await getMultiHistoricalSeries(selectedAreas);
    chartData = result.merged;
    chartAreas = result.areas;
  }

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
        <CompareChart data={chartData} areas={chartAreas} />
      )}
    </main>
  );
}
