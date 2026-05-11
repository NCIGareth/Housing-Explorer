"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { Map as OlMap, View, Overlay } from "ol";
import TileLayer from "ol/layer/Tile";
import OSM from "ol/source/OSM";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import ClusterSource from "ol/source/Cluster";
import HeatmapLayer from "ol/layer/Heatmap";
import { Feature } from "ol";
import { Point } from "ol/geom";
import { fromLonLat } from "ol/proj";
import { Style, Icon, Circle, Fill, Stroke, Text } from "ol/style";
import { boundingExtent } from "ol/extent";

export type MapViewMode = "points" | "heatmap" | "clusters" | "boundaries";

export type PprPoint = {
  id: string;
  address: string;
  county: string;
  eircode?: string | null;
  priceEur: number;
  latitude: number | null;
  longitude: number | null;
  estimatedEircode?: string | null;
  estimatedLatitude?: number | null;
  estimatedLongitude?: number | null;
  descriptionOfProperty?: string | null;
};

function resolvePointCoords(point: PprPoint) {
  if (point.latitude != null && point.longitude != null) {
    return { lat: point.latitude, lon: point.longitude };
  }

  if (point.estimatedLatitude != null && point.estimatedLongitude != null) {
    return { lat: point.estimatedLatitude, lon: point.estimatedLongitude };
  }

  return null;
}

function encodeSVG(svg: string) {
  return typeof window !== "undefined"
    ? window.btoa(new TextEncoder().encode(svg).reduce((data, byte) => data + String.fromCharCode(byte), ""))
    : "";
}

const MARKER_STYLE = (() => {
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
})();

const PRICE_TIER_COLORS = [
  { max: 200000, color: "#22c55e", label: "Under €200k" },
  { max: 350000, color: "#84cc16", label: "€200k-€350k" },
  { max: 500000, color: "#eab308", label: "€350k-€500k" },
  { max: 750000, color: "#f97316", label: "€500k-€750k" },
  { max: Infinity, color: "#ef4444", label: "Over €750k" },
];

function priceTierColor(price: number): string {
  for (const tier of PRICE_TIER_COLORS) {
    if (price <= tier.max) return tier.color;
  }
  return "#ef4444";
}

function createClusterStyle(features: Feature[]) {
  const size = features.length;
  return new Style({
    image: new Circle({
      radius: Math.min(12 + size * 1.5, 30),
      fill: new Fill({ color: "rgba(37, 99, 235, 0.7)" }),
      stroke: new Stroke({ color: "#fff", width: 2 }),
    }),
    text: new Text({
      text: size.toString(),
      fill: new Fill({ color: "#fff" }),
      font: "bold 12px sans-serif",
    }),
  });
}

function createDataLayer(source: VectorSource, mode: MapViewMode) {
  if (mode === "heatmap") {
    return new HeatmapLayer({
      source,
      blur: 15,
      radius: 10,
      weight: (feature) => {
        const point = feature.get("point") as PprPoint | undefined;
        return point ? Math.min(point.priceEur / 1000000, 1) : 0;
      },
    });
  }

  if (mode === "clusters") {
    const clusterSource = new ClusterSource({ distance: 40, source });
    return new VectorLayer({
      source: clusterSource,
      style: (feature) => createClusterStyle(feature.get("features")),
    });
  }

  if (mode === "boundaries") {
    return new VectorLayer({
      source,
      style: MARKER_STYLE,
    });
  }

  return new VectorLayer({ source, style: MARKER_STYLE });
}

export const MarketMap: React.FC<{
  points?: PprPoint[];
  pprPreview?: PprPoint[];
  viewMode?: MapViewMode;
}> = React.memo(({ pprPreview, points, viewMode = "points" }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<OlMap | null>(null);
  const vectorSourceRef = useRef(new VectorSource());
  const boundarySourceRef = useRef(new VectorSource());
  const dataLayerRef = useRef<VectorLayer | HeatmapLayer | null>(null);
  const viewModeRef = useRef(viewMode);
  viewModeRef.current = viewMode;
  const featureMapRef = useRef<Map<string, Feature<Point>>>(new Map());

  const [markerCount, setMarkerCount] = useState(0);

  const dataToUse = useMemo(
    () => pprPreview || points || [],
    [pprPreview, points]
  );

  const rebuildBoundaries = useCallback(() => {
    const features = vectorSourceRef.current.getFeatures();
    const groups: Record<string, { prices: number[]; coords: number[][] }> = {};

    for (const f of features) {
      const point = f.get("point") as PprPoint | undefined;
      if (!point) continue;
      const routingKey = (point.eircode || point.estimatedEircode || "").substring(0, 3).toUpperCase();
      if (!routingKey || routingKey.length < 2) continue;
      if (!groups[routingKey]) groups[routingKey] = { prices: [], coords: [] };
      groups[routingKey].prices.push(point.priceEur);
      const geom = f.getGeometry() as Point | undefined;
      if (geom) groups[routingKey].coords.push(geom.getCoordinates());
    }

    const boundaryFeatures: Feature[] = [];
    for (const key of Object.keys(groups)) {
      const { prices, coords } = groups[key];
      if (coords.length < 2) continue;
      const centroid: number[] = [
        coords.reduce((s, c) => s + c[0], 0) / coords.length,
        coords.reduce((s, c) => s + c[1], 0) / coords.length,
      ];
      const sorted = [...prices].sort((a, b) => a - b);
      const medianPrice = sorted[Math.floor(sorted.length / 2)];

      const bf = new Feature({
        geometry: new Point(centroid),
        routingKey: key,
        medianPrice,
        volume: prices.length,
      });
      boundaryFeatures.push(bf);
    }

    boundarySourceRef.current.clear();
    boundarySourceRef.current.addFeatures(boundaryFeatures);
  }, []);

  const swapDataLayer = useCallback((map: OlMap, source: VectorSource, mode: MapViewMode) => {
    const oldLayer = dataLayerRef.current;
    if (oldLayer) map.removeLayer(oldLayer);

    if (mode === "boundaries") {
      const layer = new VectorLayer({
        source: boundarySourceRef.current,
        style: (feature) => {
          const price = feature.get("medianPrice") as number;
          const key = feature.get("routingKey") as string;
          const volume = feature.get("volume") as number;
          const color = priceTierColor(price);
          return [
            new Style({
              image: new Circle({
                radius: Math.min(12 + volume * 0.3, 28),
                fill: new Fill({ color: color + "BB" }),
                stroke: new Stroke({ color: "#fff", width: 2 }),
              }),
            }),
            new Style({
              text: new Text({
                text: `${key}\n€${(price / 1000).toFixed(0)}k`,
                fill: new Fill({ color: "#0f172a" }),
                font: "bold 11px sans-serif",
                stroke: new Stroke({ color: "#fff", width: 3 }),
                textAlign: "center",
                offsetY: -15,
              }),
            }),
          ];
        },
      });
      dataLayerRef.current = layer;
      map.getLayers().insertAt(1, layer);
      return;
    }

    const newLayer = createDataLayer(source, mode);
    dataLayerRef.current = newLayer;
    map.getLayers().insertAt(1, newLayer);
  }, []);

  const updateMarkers = useCallback(() => {
    const vectorSource = vectorSourceRef.current;
    const map = mapInstance.current;
    if (!map) return;

    const featureMap = featureMapRef.current;
    const newIds = new Set(dataToUse.map((p) => p.id));

    let changed = false;

    for (const [id, feature] of featureMap) {
      if (!newIds.has(id)) {
        vectorSource.removeFeature(feature);
        featureMap.delete(id);
        changed = true;
      }
    }

    for (const point of dataToUse) {
      const coords = resolvePointCoords(point);
      if (!coords) continue;

      const existing = featureMap.get(point.id);
      if (existing) {
        const geom = existing.getGeometry()!;
        const newCoords = fromLonLat([coords.lon, coords.lat]);
        const old = geom.getCoordinates();
        if (old[0] !== newCoords[0] || old[1] !== newCoords[1]) {
          geom.setCoordinates(newCoords);
          changed = true;
        }
        existing.set("point", point);
      } else {
        const feature = new Feature({
          geometry: new Point(fromLonLat([coords.lon, coords.lat])),
          point,
        });
        featureMap.set(point.id, feature);
        vectorSource.addFeature(feature);
        changed = true;
      }
    }

    setMarkerCount(featureMap.size);

    if (!changed) return;

    rebuildBoundaries();

    const extent = vectorSource.getExtent();
    if (extent && extent[0] !== Infinity) {
      map.getView().fit(extent, {
        padding: [50, 50, 50, 50],
        maxZoom: 16,
        duration: 400,
      });
    }
  }, [dataToUse, rebuildBoundaries]);

  /* ================= MAP INIT ================= */

  useEffect(() => {
    if (!mapRef.current || !overlayRef.current) return;

    const overlay = new Overlay({
      element: overlayRef.current,
      positioning: "bottom-center",
      offset: [0, -10],
    });

    const tileLayer = new TileLayer({ source: new OSM() });

    const map = new OlMap({
      target: mapRef.current,
      layers: [tileLayer],
      overlays: [overlay],
      view: new View({
        center: fromLonLat([-6.2603, 53.3498]),
        zoom: 10,
      }),
    });

    mapInstance.current = map;

    swapDataLayer(map, vectorSourceRef.current, viewModeRef.current);

    map.on("click", (event) => {
      const feature = map.forEachFeatureAtPixel(event.pixel, (f) => f as Feature);

      if (!feature) {
        overlay.setPosition(undefined);
        return;
      }

      if (viewModeRef.current === "clusters") {
        const clusterFeatures = feature.get("features") as Feature[] | undefined;
        if (clusterFeatures && clusterFeatures.length > 1) {
          const coords = clusterFeatures
            .map((f) => {
              const geom = f.getGeometry() as Point | undefined;
              return geom ? geom.getCoordinates() : null;
            })
            .filter((c): c is number[] => c !== null);
          if (coords.length > 0) {
            const extent = boundingExtent(coords);
            map.getView().fit(extent, { padding: [50, 50, 50, 50], maxZoom: 16, duration: 400 });
          }
          return;
        }
      }

      const el = overlayRef.current!;

      if (viewModeRef.current === "boundaries") {
        const routingKey = feature.get("routingKey") as string | undefined;
        if (routingKey) {
          el.style.display = "block";
          el.textContent = "";
          const medianPrice = feature.get("medianPrice") as number;
          const volume = feature.get("volume") as number;
          const root = document.createElement("div");
          root.className = "bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 w-64 overflow-hidden animate-in fade-in zoom-in duration-200";
          const pad = document.createElement("div");
          pad.className = "p-4 space-y-3";
          const s1 = document.createElement("div");
          s1.className = "space-y-1";
          const badge = document.createElement("span");
          badge.className = "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-100 text-blue-700";
          badge.textContent = "Area Overview";
          const h3 = document.createElement("h3");
          h3.className = "font-bold text-slate-900";
          h3.textContent = `Eircode Routing Key: ${routingKey}`;
          s1.append(badge, h3);
          const flex = document.createElement("div");
          flex.className = "flex items-baseline gap-1";
          const lbl = document.createElement("span");
          lbl.className = "text-xs font-bold text-slate-400";
          lbl.textContent = "Median";
          const val = document.createElement("span");
          val.className = "text-xl font-black text-slate-900";
          val.textContent = `€${medianPrice.toLocaleString()}`;
          flex.append(lbl, val);
          const p = document.createElement("p");
          p.className = "text-xs text-slate-500";
          p.textContent = `Based on ${volume} recorded sales`;
          pad.append(s1, flex, p);
          root.append(pad);
          el.appendChild(root);
          overlay.setPosition(event.coordinate);
          return;
        }
      }

      const point = feature.get("point") as PprPoint;
      if (!point || !overlayRef.current) return;

      el.style.display = "block";
      el.textContent = "";

      const price = point.priceEur;
      const detailUrl = `/sales/${point.id}`;

      const root = document.createElement("div");
      root.className = "bg-white p-0 rounded-2xl shadow-2xl border border-slate-200 w-64 overflow-hidden animate-in fade-in zoom-in duration-200";
      const pad = document.createElement("div");
      pad.className = "p-4 space-y-3";
      const s1 = document.createElement("div");
      s1.className = "space-y-1";
      const badge = document.createElement("span");
      badge.className = "inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-100 text-red-700";
      badge.textContent = "Historical Sale";
      const h3 = document.createElement("h3");
      h3.className = "font-bold text-slate-900 leading-tight truncate";
      h3.textContent = point.address;
      const pCounty = document.createElement("p");
      pCounty.className = "text-xs text-slate-500 font-medium";
      pCounty.textContent = point.county;
      s1.append(badge, h3, pCounty);
      const flex = document.createElement("div");
      flex.className = "flex items-baseline gap-1";
      const eur = document.createElement("span");
      eur.className = "text-xs font-bold text-slate-400";
      eur.textContent = "€";
      const val = document.createElement("span");
      val.className = "text-xl font-black text-slate-900";
      val.textContent = price.toLocaleString();
      flex.append(eur, val);
      const a = document.createElement("a");
      a.href = detailUrl;
      a.className = "flex items-center justify-center w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all hover:shadow-lg active:scale-[0.98]";
      a.textContent = "View Property Record";
      pad.append(s1, flex, a);
      root.append(pad);
      const closeBtn = document.createElement("button");
      closeBtn.className = "absolute top-2 right-2 h-6 w-6 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 transition-colors";
      closeBtn.innerHTML = "✕";
      closeBtn.onclick = () => overlay.setPosition(undefined);
      root.appendChild(closeBtn);
      root.style.position = "relative";
      el.appendChild(root);
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

  /* ================= SWAP LAYER ON VIEW MODE CHANGE ================= */

  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;
    swapDataLayer(map, vectorSourceRef.current, viewMode);
  }, [viewMode, swapDataLayer]);

  /* ================= UPDATE MARKERS WHEN DATA CHANGES ================= */

  useEffect(() => {
    updateMarkers();
  }, [updateMarkers]);

  const countLabel = viewMode === "clusters" ? "Clusters"
    : viewMode === "heatmap" ? "Heatmap"
    : viewMode === "boundaries" ? "Areas"
    : "Markers";

  return (
    <div className="relative w-full">
      <div
        ref={mapRef}
        className="w-full h-96 border rounded-lg"
        style={{ width: "100%", height: "400px" }}
      />

      <div ref={overlayRef} className="pointer-events-auto" />

      <div className="absolute top-2 left-2 bg-white px-3 py-1 rounded shadow text-sm font-medium border">
        {countLabel}: {markerCount}
      </div>
    </div>
  );
});

MarketMap.displayName = "MarketMap";

export default MarketMap;
