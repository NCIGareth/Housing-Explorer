"use client";

import { useMemo } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine
} from "recharts";

type DataPoint = {
  period: string; // Format: "YYYYMxx" (e.g. "2015M01")
  value: number;
};

interface MarketTrendChartProps {
  data: DataPoint[];
  title?: string;
  subtitle?: string;
}

export function MarketTrendChart({ data, title = "Residential Property Price Index", subtitle = "Official CSO Inflation Metric (2015=100)" }: MarketTrendChartProps) {
  // Format period strings into sortable dates and downsample if needed
  const formattedData = useMemo(() => {
    return data
      .map((d: typeof data[0]) => {
        // CSO format is YYYYMxx e.g. 2015M01
        const year = d.period.substring(0, 4);
        const month = d.period.substring(5, 7);
        const date = new Date(parseInt(year), parseInt(month) - 1, 1);
        
        return {
          originalPeriod: d.period,
          sortVal: date.getTime(),
          label: `${month}/${year}`,
          year: year,
          value: d.value
        };
      })
      .sort((a, b) => a.sortVal - b.sortVal);
    // For large datasets (e.g. monthly since 2005 = ~240 points), standard Recharts handles this well natively.
  }, [data]);

  if (!formattedData.length) return null;

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
      <div className="mb-6">
        <h3 className="font-outfit font-bold text-slate-800 text-lg">{title}</h3>
        <p className="text-sm text-slate-500">{subtitle}</p>
      </div>

      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorIndex" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="year" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#94a3b8' }}
              minTickGap={30}
            />
            <YAxis 
              domain={['auto', 'auto']}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: '#94a3b8' }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 text-white p-3 rounded-lg shadow-xl text-sm border border-slate-700">
                      <div className="text-slate-400 mb-1">{payload[0].payload.label}</div>
                      <div className="font-bold font-outfit text-blue-400">
                        Index: {payload[0].value}
                      </div>
                    </div>
                  );
                }
                return null;
              }}
            />
            <ReferenceLine y={100} stroke="#94a3b8" strokeDasharray="3 3" />
            <Area
              type="monotone"
              dataKey="value"
              stroke="#3b82f6"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorIndex)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
