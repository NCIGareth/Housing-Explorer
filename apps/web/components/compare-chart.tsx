"use client";

import React from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from "recharts";

const LINE_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706",
  "#7c3aed", "#db2777", "#0891b2", "#ca8a04",
];

export const CompareChart = React.memo(function CompareChart({
  data,
  areas,
  mode,
}: {
  data: Array<Record<string, string | number>>;
  areas: string[];
  mode: "index" | "median";
}) {
  const median = mode === "median";

  if (data.length === 0) {
    return (
      <div className="h-[400px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400 italic">
        Select areas above to compare price trends
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <h3 className="text-lg font-bold text-slate-900 mb-1">Price Trend Comparison</h3>
      <p className="text-sm text-slate-500 mb-4">
        {median
          ? "PPR median sale price (€, quarterly) across selected areas"
          : "CSO Residential Property Price Index (2015 = 100) across selected counties"}
      </p>

      <ResponsiveContainer width="100%" height={400}>
        <LineChart data={data} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis
            dataKey="period"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8" }}
            interval={Math.max(Math.floor(data.length / 8), 0)}
          />
          <YAxis
            fontSize={11}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#94a3b8" }}
            tickFormatter={(val) => (val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val)}
          />
          <Tooltip
            contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
            formatter={(value: number, name: string) => [
              median ? `€${Number(value).toLocaleString()}` : Number(value).toLocaleString(),
              name.replace(/_/g, " "),
            ]}
            labelStyle={{ fontWeight: "bold", marginBottom: "4px" }}
          />
          <Legend
            formatter={(value: string) => (
              <span className="text-sm font-medium text-slate-700">{value.replace(/_/g, " ")}</span>
            )}
          />
          {areas.map((area, i) => {
            const key = area.replace(/\s+/g, "_");
            return (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, strokeWidth: 0 }}
                animationDuration={800}
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});
