"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import type { PprPoint, MapViewMode } from "./market-map-openlayers";

const OpenLayersMap = dynamic(() => import("./market-map-openlayers"), {
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
});

interface ClientMapProps {
  center?: [number, number];
  zoom?: number;
  pprPreview?: PprPoint[];
}

const VIEW_OPTIONS: { mode: MapViewMode; label: string }[] = [
  { mode: "points", label: "Points" },
  { mode: "heatmap", label: "Heatmap" },
  { mode: "clusters", label: "Clusters" },
  { mode: "boundaries", label: "Areas" },
];

export default function ClientMapView({ pprPreview = [] }: ClientMapProps) {
  const [viewMode, setViewMode] = useState<MapViewMode>("points");

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <OpenLayersMap pprPreview={pprPreview} viewMode={viewMode} />

        <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 rounded-lg shadow-sm border p-1">
          {VIEW_OPTIONS.map((opt) => (
            <button
              key={opt.mode}
              onClick={() => setViewMode(opt.mode)}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                viewMode === opt.mode
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
