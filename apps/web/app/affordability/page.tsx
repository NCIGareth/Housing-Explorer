import type { Metadata } from "next";
import {
  averageRateForYear,
  getAffordabilityRankingByYear,
  getAffordabilityYears,
  getIncomeHistory,
  getLatestIncomeYear,
  getMortgageProductMix,
  getMortgageRateHistory,
  type AffordabilityRow,
} from "@/lib/queries";
import { AffordabilityExplorer } from "./affordability-explorer";

export async function generateMetadata(): Promise<Metadata> {
  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://irelandhousingexplorer.com";

  return {
    title: "Affordability | Ireland Housing Explorer",
    description:
      "Compare how many years of income it takes to buy the median house in each Irish county, see the history of Irish mortgage rates, and check what you can borrow under Central Bank rules.",
    alternates: { canonical: `${baseUrl}/affordability` },
  };
}

export default async function AffordabilityPage() {
  const [years, latestIncomeYear, incomeHistory, rateHistory, productMix] = await Promise.all([
    getAffordabilityYears(),
    getLatestIncomeYear(),
    getIncomeHistory([
      "Dublin",
      "Dún Laoghaire–Rathdown",
      "Fingal",
      "South Dublin",
      "Carlow",
      "Cavan",
      "Clare",
      "Cork",
      "Donegal",
      "Galway",
      "Kerry",
      "Kildare",
      "Kilkenny",
      "Laois",
      "Leitrim",
      "Limerick",
      "Longford",
      "Louth",
      "Mayo",
      "Meath",
      "Monaghan",
      "Offaly",
      "Roscommon",
      "Sligo",
      "Tipperary",
      "Waterford",
      "Westmeath",
      "Wexford",
      "Wicklow",
    ]),
    getMortgageRateHistory(),
    getMortgageProductMix(),
  ]);

  if (years.length === 0) {
    return (
      <main className="max-w-5xl mx-auto p-4 md:p-8">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Affordability</h1>
        <p className="text-sm text-slate-500 mt-2">
          Data is still loading — median price and income series are not available yet.
        </p>
      </main>
    );
  }

  const defaultYear = latestIncomeYear
    ? Math.min(Math.max(years[years.length - 1], years[0]), latestIncomeYear)
    : years[years.length - 1];

  const [rankingByYear, rateByYear] = await Promise.all([
    Promise.all(
      years.map(async (year) => [year, await getAffordabilityRankingByYear(year)] as const)
    ).then((entries): Record<number, AffordabilityRow[]> => {
      const map: Record<number, AffordabilityRow[]> = {};
      for (const [year, rows] of entries) map[year] = rows;
      return map;
    }),
    Promise.resolve(
      Object.fromEntries(years.map((year) => [year, averageRateForYear(rateHistory, year)] as const))
    ),
  ]);

  const counties = Object.keys(rankingByYear[defaultYear] ?? {})
    .length > 0
    ? (rankingByYear[defaultYear] ?? []).map((r) => r.county)
    : [];

  const incomeByCounty: Record<string, Array<{ period: string; value: number }>> = {};
  for (const row of incomeHistory) {
    incomeByCounty[row.geography] ??= [];
    incomeByCounty[row.geography].push({ period: row.period, value: row.value });
  }
  for (const key of Object.keys(incomeByCounty)) {
    incomeByCounty[key].sort((a, b) => a.period.localeCompare(b.period));
  }

  const latestRatePct = rateHistory.length > 0 ? rateHistory[rateHistory.length - 1].overall : 3.5;

  return (
    <main className="max-w-5xl mx-auto p-4 md:p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Affordability</h1>
        <p className="text-sm text-slate-500 mt-1">
          House prices vs income, mortgage rate history, and what the Central Bank rules mean for your budget
        </p>
      </div>

      <AffordabilityExplorer
        years={years}
        defaultYear={defaultYear}
        counties={counties}
        rankingByYear={rankingByYear}
        incomeByCounty={incomeByCounty}
        rateHistory={rateHistory}
        productMix={productMix}
        rateByYear={rateByYear}
        latestRatePct={latestRatePct}
      />
    </main>
  );
}
