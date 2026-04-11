// C:\Users\Gareth\Code\Housing\apps\web\components\client-map-view.tsx
"use client";

import dynamic from "next/dynamic";

import type { PprPoint } from "./market-map-openlayers";

const OpenLayersMap = dynamic(() => import("./market-map-openlayers"), { 
  ssr: false,
  loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />
});

interface ClientMapProps {
  center?: [number, number];
  zoom?: number;
  pprPreview?: PprPoint[];
}

export default function ClientMapView({ pprPreview = [] }: ClientMapProps) {
  return <OpenLayersMap pprPreview={pprPreview} />;
}