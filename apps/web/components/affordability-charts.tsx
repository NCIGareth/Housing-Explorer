"use client";

import React from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type AffordabilityRow = {
  county: string;
  year: number;
  medianPrice: number | null;
  income: number | null;
  ratio: number | null;
};

const FONT = { fontSize: 11, fill: "#94a3b8" };

const tooltipStyle = {
  borderRadius: "8px",
  border: "none",
  boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
};

function ratioColor(ratio: number): string {
  if (ratio < 4) return "#16a34a";
  if (ratio < 6) return "#d97706";
  return "#dc2626";
}

function RankTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload: AffordabilityRow }>; label?: string }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  return (
    <div className="rounded-lg bg-white px-3 py-2 text-xs shadow-lg border border-slate-100">
      <div className="font-bold text-slate-900 mb-1">{label}</div>
      <div className="text-slate-600">
        {row.ratio !== null ? `${row.ratio.toFixed(1)} yrs of income` : "n/a"}
      </div>
      <div className="text-slate-500">
        Median {row.medianPrice !== null ? `€${row.medianPrice.toLocaleString()}` : "n/a"} · Income {row.income !== null ? `€${Math.round(row.income).toLocaleString()}` : "n/a"}
      </div>
    </div>
  );
}

export const AffordabilityRankingChart = React.memo(function AffordabilityRankingChart({
  data,
  year,
}: {
  data: AffordabilityRow[];
  year: number;
}) {
  const sorted = [...data]
    .filter((r) => r.ratio !== null)
    .sort((a, b) => (a.ratio as number) - (b.ratio as number));

  if (sorted.length === 0) {
    return (
      <div className="h-[520px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400 italic">
        No affordability data for {year}
      </div>
    );
  }

  return (
    <div>
      <ResponsiveContainer width="100%" height={520}>
        <BarChart data={sorted} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis type="number" tick={FONT} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}`} />
          <YAxis
            type="category"
            dataKey="county"
            width={130}
            tick={{ ...FONT, fontSize: 10 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip content={<RankTooltip />} />
          <Bar dataKey="ratio" name="Years of income" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {sorted.map((r) => (
              <Cell key={r.county} fill={ratioColor(r.ratio as number)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-1">
        Lower is more affordable. Ratio = median house price ÷ disposable income per person (CSO RAA02).
      </p>
    </div>
  );
});

export const CountyTrendChart = React.memo(function CountyTrendChart({
  points,
}: {
  points: Array<{ year: number; ratio: number | null }>;
}) {
  const data = points.filter((p) => p.ratio !== null);
  if (data.length === 0) {
    return (
      <div className="h-[240px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400 italic">
        No trend data for this county
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 15, left: 10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
        <XAxis dataKey="year" tick={FONT} tickLine={false} axisLine={false} />
        <YAxis
          tick={FONT}
          tickLine={false}
          axisLine={false}
          domain={[(min: number) => Math.floor(min - 0.5), (max: number) => Math.ceil(max + 0.5)]}
        />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(value: number) => [`${value.toFixed(1)} yrs of income`, "Ratio"]}
          labelFormatter={(label) => `Year ${label}`}
        />
        <Line type="monotone" dataKey="ratio" stroke="#2563eb" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
});

export const MortgageRatesChart = React.memo(function MortgageRatesChart({
  data,
}: {
  data: Array<{ period: string; overall: number; floating: number; over_1y_fixed: number }>;
}) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={FONT}
            tickLine={false}
            axisLine={false}
            tickFormatter={(p: string) => p.slice(0, 4)}
            interval={Math.max(Math.floor(data.length / 8), 0)}
          />
          <YAxis tick={FONT} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, "auto"]} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [`${value.toFixed(2)}%`, name]}
            labelFormatter={(label) => `Month ${label.slice(0, 4)}-${label.slice(4)}`}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="overall" name="New business (avg)" stroke="#2563eb" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="floating" name="Floating / ≤1yr fixed" stroke="#d97706" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="over_1y_fixed" name="Over 1yr fixed" stroke="#16a34a" strokeWidth={1.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-1">
        Average interest rates on new mortgage lending, Ireland, monthly (CBI B.2.1).
      </p>
    </div>
  );
});

export const ProductMixChart = React.memo(function ProductMixChart({
  data,
}: {
  data: Array<{ period: string; fixedSharePct: number | null; trackerSharePct: number | null; variableSharePct: number | null }>;
}) {
  const clean = data.filter((d) => d.fixedSharePct !== null);
  if (clean.length === 0) return null;

  return (
    <div>
      <ResponsiveContainer width="100%" height={280}>
        <AreaChart data={clean} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            tick={FONT}
            tickLine={false}
            axisLine={false}
            tickFormatter={(p: string) => p.slice(0, 4)}
            interval={Math.max(Math.floor(clean.length / 6), 0)}
          />
          <YAxis tick={FONT} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(value: number, name: string) => [`${value.toFixed(0)}%`, name]}
            labelFormatter={(label) => `Quarter ${label}`}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area type="monotone" dataKey="fixedSharePct" name="Fixed" stackId="1" stroke="#2563eb" fill="#2563eb" fillOpacity={0.85} />
          <Area type="monotone" dataKey="trackerSharePct" name="Tracker" stackId="1" stroke="#16a34a" fill="#16a34a" fillOpacity={0.7} />
          <Area type="monotone" dataKey="variableSharePct" name="Variable" stackId="1" stroke="#d97706" fill="#d97706" fillOpacity={0.7} />
        </AreaChart>
      </ResponsiveContainer>
      <p className="text-xs text-slate-400 mt-1">
        Share of new Principal Dwelling House mortgage lending by product type (CBI B.3.1).
      </p>
    </div>
  );
});
