"use client";

import { useMemo } from "react";
import type { PprPoint } from "./market-map-openlayers";

function extractBeds(description: string | null | undefined): number | null {
  if (!description) return null;
  const match = description.match(/(\d+)\s*bed/i);
  return match ? parseInt(match[1]) : null;
}

export function PricePerUnitPanel({ points }: { points: PprPoint[] }) {
  const groups = useMemo(() => {
    const map = new Map<number, { prices: number[] }>();
    for (const p of points) {
      const beds = extractBeds(p.descriptionOfProperty);
      if (beds === null || beds < 1 || beds > 10) continue;
      if (!map.has(beds)) map.set(beds, { prices: [] });
      map.get(beds)!.prices.push(p.priceEur);
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a - b)
      .map(([beds, { prices }]) => ({
        beds,
        count: prices.length,
        avgPrice: Math.round(prices.reduce((a, b) => a + b, 0) / prices.length),
      }));
  }, [points]);

  if (groups.length === 0) return null;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
        Avg Price by Bed Count
      </h4>
      <div className="space-y-2">
        {groups.map((g) => (
          <div key={g.beds} className="flex items-center justify-between text-sm">
            <span className="text-slate-600 font-medium">{g.beds} Bed</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-900">
                €{g.avgPrice.toLocaleString("en-IE")}
              </span>
              <span className="text-xs text-slate-400">({g.count})</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
