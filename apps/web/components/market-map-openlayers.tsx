"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Map, View, Overlay } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Style, Icon } from "ol/style";

/* ================= TYPES ================= */

export type PprPoint = {
  id: string;
  address: string;
  county: string;
  eircode?: string | null;
  priceEur: number;
  latitude: number | null;
  longitude: number | null;
};

/* ================= HELPERS ================= */

const routingKeyCoordinates: Record<
  string,
  { latitude: number; longitude: number }
> = {
  D01: { latitude: 53.3401, longitude: -6.2604 },
  D02: { latitude: 53.3203, longitude: -6.2747 },
  D06: { latitude: 53.2909, longitude: -6.2373 },
  D14: { latitude: 53.2834, longitude: -6.266 },
};

function getRoutingKeyCentroid(eircode?: string | null) {
  if (!eircode) return null;
  return routingKeyCoordinates[eircode.slice(0, 3).toUpperCase()] || null;
}

function resolvePointCoords(point: PprPoint) {
  if (point.latitude != null && point.longitude != null) {
    return { lat: point.latitude, lon: point.longitude };
  }

  const centroid = getRoutingKeyCentroid(point.eircode);
  if (centroid) {
    return { lat: centroid.latitude, lon: centroid.longitude };
  }

  return null;
}

function encodeSVG(svg: string) {
  return typeof window !== "undefined"
    ? window.btoa(new TextEncoder().encode(svg).reduce((data, byte) => data + String.fromCharCode(byte), ""))
    : "";
}

function createMarkerStyle() {
  const svg = `
    <svg width="24" height="24" xmlns="http://www.w3.org/2000/svg">
      <circle cx="12" cy="12" r="10" fill="#ef4444" stroke="white" stroke-width="2"/>
      <text x="12" y="15" text-anchor="middle" fill="white" font-size="10" font-weight="bold">€</text>
    </svg>
  `;

  return new Style({
    image: new Icon({
      src: `data:image/svg+xml;base64,${encodeSVG(svg)}`,
      scale: 0.8,
    }),
  });
}

/* ================= COMPONENT ================= */

export const MarketMap: React.FC<{
  points?: PprPoint[]; // Legacy prop to avoid breaking current usage if not yet updated
  pprPreview?: PprPoint[];
}> = ({ pprPreview, points }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const mapInstance = useRef<Map | null>(null);
  const vectorSourceRef = useRef(new VectorSource());

  const [markerCount, setMarkerCount] = useState(0);

  /* ================= MARKERS ================= */

  const updateMarkers = useCallback(() => {
    const vectorSource = vectorSourceRef.current;
    const map = mapInstance.current;
    if (!map) return;

    const dataToUse = pprPreview || points || [];
    const features = dataToUse
      .map((point) => {
        const coords = resolvePointCoords(point);
        if (!coords) return null;

        const feature = new Feature({
          geometry: new Point(fromLonLat([coords.lon, coords.lat])),
          point,
        });

        feature.setStyle(createMarkerStyle());
        return feature;
      })
      .filter((f): f is Feature<Point> => f !== null);

    vectorSource.clear();
    vectorSource.addFeatures(features);
    setMarkerCount(features.length);

    if (features.length > 0) {
      const extent = vectorSource.getExtent();
      if (extent && extent[0] !== Infinity) {
        map.getView().fit(extent, {
          padding: [50, 50, 50, 50],
          maxZoom: 16,
          duration: 400,
        });
      }
    }
  }, [pprPreview, points]);

  /* ================= MAP INIT (RUN ONCE) ================= */

  useEffect(() => {
    if (!mapRef.current || !overlayRef.current) return;

    const overlay = new Overlay({
      element: overlayRef.current,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    const map = new Map({
      target: mapRef.current,
      layers: [
        new TileLayer({ source: new OSM() }),
        new VectorLayer({ source: vectorSourceRef.current }),
      ],
      overlays: [overlay],
      view: new View({
        center: fromLonLat([-6.2603, 53.3498]),
        zoom: 10,
      }),
    });

    mapInstance.current = map;

    // Handle clicks for selection
    map.on("click", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f as Feature);

      if (!feature) {
        overlay.setPosition(undefined);
        return;
      }

      const point = feature.get("point") as PprPoint;
      if (!point || !overlayRef.current) return;

      overlayRef.current.style.display = 'block';

      const title = point.address;
      const price = point.priceEur;
      const detailUrl = `/sales/${point.id}`;

      overlayRef.current.innerHTML = `
        <div class="bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 w-64 overflow-hidden animate-in fade-in zoom-in duration-200">
          <div class="p-4 space-y-3">
            <div class="space-y-1">
              <span class="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700">
                Historical Sale
              </span>
              <h3 class="font-bold text-slate-900 leading-tight truncate">${title}</h3>
              <p class="text-xs text-slate-500 font-medium">${point.county}</p>
            </div>
            
            <div class="flex items-baseline gap-1">
              <span class="text-xs font-bold text-slate-400">€</span>
              <span class="text-xl font-black text-slate-900">${price.toLocaleString()}</span>
            </div>

            <a href="${detailUrl}" class="flex items-center justify-center w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg active:scale-[0.98]">
              View Property Record
            </a>
          </div>
          <button onclick="this.closest('.ol-overlay-container').style.display='none'" class="absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
            ✕
          </button>
        </div>
      `;

      overlay.setPosition(event.coordinate);
    });

    map.on("pointermove", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f as Feature);
      map.getTargetElement().style.cursor = feature ? "pointer" : "";
    });

    return () => {
      map.setTarget(undefined);
      mapInstance.current = null;
    };
  }, []);

  /* ================= UPDATE MARKERS WHEN DATA CHANGES ================= */

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  return (
    <div className="relative w-full">
      <div
        ref={mapRef}
        className="w-full h-96 border rounded-lg"
        style={{   width: "100%",
    height: "400px",
    background: "red", }}
      />

      <div ref={overlayRef} className="pointer-events-auto" />

      <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow text-sm font-medium border">
        Markers: {markerCount}
      </div>
    </div>
  );
};

export default MarketMap;