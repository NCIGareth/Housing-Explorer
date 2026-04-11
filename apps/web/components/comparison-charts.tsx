"use client";

import React, { useMemo } from "react";
import {
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

export const ComparisonCharts = React.memo(function ComparisonCharts({
  historical,
  subtitle,
}: {
  historical: Array<{ period: string; value: number }>;
  subtitle?: string;
}) {
  // 1. Decimate the labels on the X-Axis so they don't overlap
  // Only show the year if we have many data points
  const interval = useMemo(() => {
    if (historical.length > 48) return 11; // Show roughly one label per year
    if (historical.length > 12) return 5;
    return 0;
  }, [historical.length]);

  return (
    <section className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm" style={{ minHeight: 360 }}>
      <div className="mb-4">
        <h3 className="text-lg font-bold text-slate-900">Market Price Trend</h3>
        {subtitle && (
          <p className="text-sm text-slate-500 mt-1">{subtitle}</p>
        )}
      </div>

      {historical.length === 0 ? (
        <div className="h-[260px] flex items-center justify-center bg-slate-50 rounded-lg border border-dashed text-slate-400 italic">
          No series data for this county yet.
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={historical} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            {/* 2. Add a light grid to help eye-ball values against the Y-axis */}
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            
            <XAxis 
              dataKey="period" 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8' }}
              interval={interval} // Prevents label crowding
              minTickGap={30}
            />
            
            <YAxis 
              fontSize={11}
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#94a3b8' }}
              // 3. Format Y-axis to k/m for readability (e.g., 500k instead of 500,000)
              tickFormatter={(val) => 
                val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val
              }
            />

            <Tooltip
              contentStyle={{ 
                borderRadius: '8px', 
                border: 'none', 
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)' 
              }}
              formatter={(value: number) => [
                `€${Number(value).toLocaleString()}`, 
                "Median/Index Value"
              ]}
              labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
            />

            {/* 4. Use 'monotone' for a smoother, professional curve */}
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="#2563eb" 
              strokeWidth={2.5} 
              dot={false}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </section>
  );
});