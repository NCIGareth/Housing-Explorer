"use client";

import React, { useMemo, useState } from "react";
import { calculateMortgage } from "@/lib/mortgage";
import {
  AffordabilityRankingChart,
  CountyTrendChart,
  MortgageRatesChart,
  ProductMixChart,
} from "@/components/affordability-charts";
import type {
  AffordabilityRow,
  MortgageProductMixPoint,
  MortgageRatePoint,
} from "@/lib/queries";

export type AffordabilityExplorerProps = {
  years: number[];
  defaultYear: number;
  counties: string[];
  rankingByYear: Record<number, AffordabilityRow[]>;
  incomeByCounty: Record<string, Array<{ period: string; value: number }>>;
  rateHistory: MortgageRatePoint[];
  productMix: MortgageProductMixPoint[];
  rateByYear: Record<number, number | null>;
  latestRatePct: number;
};

function parseNum(value: string): number {
  const n = parseFloat(value.replace(/[€,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

function eur(value: number): string {
  return `€${Math.round(value).toLocaleString("en-IE")}`;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100";
const labelClass = "text-xs font-medium text-slate-500";

export function AffordabilityExplorer({
  years,
  defaultYear,
  counties,
  rankingByYear,
  incomeByCounty,
  rateHistory,
  productMix,
  rateByYear,
  latestRatePct,
}: AffordabilityExplorerProps) {
  const [year, setYear] = useState(defaultYear);
  const [county, setCounty] = useState("Dublin");
  const [price, setPrice] = useState("");
  const [income, setIncome] = useState("");
  const [deposit, setDeposit] = useState("");
  const [isFtb, setIsFtb] = useState(true);
  const [termYears, setTermYears] = useState(30);
  const [ratePct, setRatePct] = useState(String(latestRatePct));

  const countyRow = (rankingByYear[year] ?? []).find((r) => r.county === county) ?? null;

  // Prefill the calculator from the selected county/year's median price + income.
  const syncFromRow = (y: number, c: string) => {
    const row = (rankingByYear[y] ?? []).find((r) => r.county === c) ?? null;
    if (row) {
      if (row.medianPrice !== null) setPrice(String(Math.round(row.medianPrice)));
      if (row.income !== null) setIncome(String(Math.round(row.income)));
    }
  };

  const handleYearChange = (next: number) => {
    setYear(next);
    syncFromRow(next, county);
  };

  const handleCountyChange = (next: string) => {
    setCounty(next);
    syncFromRow(year, next);
  };

  const trendPoints = years.map((y) => {
    const row = (rankingByYear[y] ?? []).find((r) => r.county === county) ?? null;
    return { year: y, ratio: row?.ratio ?? null };
  });

  const countyIncome = incomeByCounty[county] ?? [];
  const incomeFirst = countyIncome[0]?.value ?? null;
  const incomeLast = countyIncome[countyIncome.length - 1]?.value ?? null;

  const yearRate = rateByYear[year] ?? null;

  const calc = useMemo(
    () =>
      calculateMortgage({
        price: parseNum(price),
        grossAnnualIncome: parseNum(income),
        deposit: parseNum(deposit),
        isFirstTimeBuyer: isFtb,
        termYears,
        ratePct: parseNum(ratePct),
      }),
    [price, income, deposit, isFtb, termYears, ratePct]
  );

  const timeTravel = useMemo(() => {
    if (!countyRow || countyRow.medianPrice === null || countyRow.income === null || yearRate === null) return null;
    const monthly = calculateMortgage({
      price: countyRow.medianPrice,
      grossAnnualIncome: countyRow.income,
      deposit: 0,
      isFirstTimeBuyer: true,
      termYears: 30,
      ratePct: yearRate,
    });
    const incomeMonthly = countyRow.income / 12;
    return {
      monthlyPayment: monthly.monthlyPayment,
      shareOfIncomePct: incomeMonthly > 0 ? (monthly.monthlyPayment / incomeMonthly) * 100 : null,
    };
  }, [countyRow, yearRate]);

  return (
    <div className="space-y-8">
      {/* Controls */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label htmlFor="aff-year" className={labelClass}>Year</label>
            <select id="aff-year" className={inputClass} value={year} onChange={(e) => handleYearChange(Number(e.target.value))}>
              {[...years].reverse().map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="aff-county" className={labelClass}>County</label>
            <select id="aff-county" className={inputClass} value={county} onChange={(e) => handleCountyChange(e.target.value)}>
              {counties.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <p className="text-xs text-slate-400">
              Income: CSO RAA02 disposable income per person. Dublin income is shared across Dún Laoghaire–Rathdown, Fingal & South Dublin.
            </p>
          </div>
        </div>
      </div>

      {/* County ranking */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-1">County affordability, {year}</h3>
        <p className="text-sm text-slate-500 mb-4">
          Years of per-person income needed to buy the median-priced house
        </p>
        <AffordabilityRankingChart data={rankingByYear[year] ?? []} year={year} />
      </section>

      {/* Trend + time travel */}
      <div className="grid gap-6 lg:grid-cols-2">
        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">How {county} affordability has changed</h3>
          <p className="text-sm text-slate-500 mb-4">Years-of-income ratio over time</p>
          <CountyTrendChart points={trendPoints} />
          {incomeFirst !== null && incomeLast !== null && (
            <p className="text-xs text-slate-400 mt-2">
              Disposable income per person grew from {eur(incomeFirst)} ({countyIncome[0].period}) to {eur(incomeLast)} ({countyIncome[countyIncome.length - 1].period}).
            </p>
          )}
        </section>

        <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 mb-1">Time travel — {county} in {year}</h3>
          <p className="text-sm text-slate-500 mb-4">
            That year&apos;s income, median price and mortgage rate
          </p>
          {countyRow ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <StatCard label="Median house price" value={countyRow.medianPrice !== null ? eur(countyRow.medianPrice) : "—"} />
                <StatCard label="Income / person / year" value={countyRow.income !== null ? eur(countyRow.income) : "—"} />
                <StatCard label="Avg new mortgage rate" value={yearRate !== null ? `${yearRate.toFixed(2)}%` : "—"} />
                <StatCard label="Years of income to buy" value={countyRow.ratio !== null ? `${countyRow.ratio.toFixed(1)}` : "—"} />
              </div>
              {timeTravel && (
                <div className="rounded-lg bg-blue-50 border border-blue-100 px-4 py-3 text-sm text-slate-700">
                  A 30-year first-time-buyer mortgage at the {yearRate!.toFixed(2)}% average rate costs{" "}
                  <strong>{eur(timeTravel.monthlyPayment)}/month</strong>{" "}
                  {timeTravel.shareOfIncomePct !== null && (
                    <>≈ <strong>{timeTravel.shareOfIncomePct.toFixed(0)}%</strong> of one person&apos;s monthly income.</>
                  )}
                </div>
              )}
              {!timeTravel && (
                <p className="text-xs text-slate-400 italic">No mortgage rate data for {year}.</p>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400 italic">No data for {county} in {year}.</p>
          )}
        </section>
      </div>

      {/* Mortgage rates */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Irish mortgage rates</h3>
        <p className="text-sm text-slate-500 mb-4">Monthly average rates on new mortgage lending, 2003 → present (CBI)</p>
        <div className="grid gap-6 lg:grid-cols-2">
          <MortgageRatesChart data={rateHistory} />
          <ProductMixChart data={productMix} />
        </div>
      </section>

      {/* Calculator */}
      <section className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900 mb-1">Mortgage affordability calculator</h3>
        <p className="text-sm text-slate-500 mb-4">
          Applying Central Bank rules: 4× income (LTI) and 90% LTV up to €330,000 / 80% above for first-time buyers (80% LTV for movers).
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="calc-price" className={labelClass}>Property price (€)</label>
                <input id="calc-price" className={inputClass} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="e.g. 350000" />
              </div>
              <div>
                <label htmlFor="calc-income" className={labelClass}>Gross annual income (€)</label>
                <input id="calc-income" className={inputClass} inputMode="numeric" value={income} onChange={(e) => setIncome(e.target.value)} placeholder="e.g. 80000" />
              </div>
              <div>
                <label htmlFor="calc-deposit" className={labelClass}>Deposit (€)</label>
                <input id="calc-deposit" className={inputClass} inputMode="numeric" value={deposit} onChange={(e) => setDeposit(e.target.value)} placeholder="e.g. 50000" />
              </div>
              <div>
                <label htmlFor="calc-rate" className={labelClass}>Interest rate (% p.a.)</label>
                <input id="calc-rate" className={inputClass} inputMode="decimal" value={ratePct} onChange={(e) => setRatePct(e.target.value)} />
              </div>
              <div>
                <label htmlFor="calc-term" className={labelClass}>Term (years)</label>
                <select id="calc-term" className={inputClass} value={termYears} onChange={(e) => setTermYears(Number(e.target.value))}>
                  {[15, 20, 25, 30, 35].map((t) => (
                    <option key={t} value={t}>{t} years</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                  <input type="checkbox" checked={isFtb} onChange={(e) => setIsFtb(e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500" />
                  First-time buyer
                </label>
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 space-y-2 text-sm">
            <ResultRow label="Max borrowable" value={eur(calc.maxBorrowable)} />
            <ResultRow label="Min deposit needed" value={eur(calc.requiredDeposit)} />
            <ResultRow label="Loan required" value={eur(calc.loanNeeded)} />
            <ResultRow label="Loan-to-value" value={`${calc.ltvPct.toFixed(0)}%`} />
            <ResultRow label="Est. monthly payment" value={eur(calc.monthlyPayment)} />
            <div className={`mt-3 rounded-lg px-4 py-3 font-semibold ${calc.affordable ? "bg-green-50 text-green-700 border border-green-200" : "bg-rose-50 text-rose-700 border border-rose-200"}`}>
              {calc.affordable
                ? "✓ Within Central Bank rules"
                : calc.maxBorrowable <= 0
                  ? "Enter a price and income to check"
                  : `✗ Needs ${eur(Math.max(calc.loanNeeded - calc.maxBorrowable, 0))} more — deposit or price/income don't fit the rules`}
            </div>
            <p className="text-[11px] text-slate-400 pt-1">
              Illustrative only. Assumes 4× income cap (some FTB lending may go to 4.5× for up to 20% of loans) and ignores the 2% state levy, fees and rates above the first few years.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3">
      <div className="text-xs text-slate-500">{label}</div>
      <div className="text-lg font-bold text-slate-900 mt-0.5">{value}</div>
    </div>
  );
}

function ResultRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-slate-900">{value}</span>
    </div>
  );
}
