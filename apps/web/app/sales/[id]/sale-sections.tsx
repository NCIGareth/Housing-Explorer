import type { PprPoint } from "@/components/market-map-openlayers";
import { getLocalCrimeStats, getRecentPprSales, getSingleEircodeRoutingKeyStats } from "@/lib/queries";
import ClientMapView from "@/components/client-map-view";
import { CrimeStatsGrid } from "@/components/crime-stats-grid";
import { AreaSnapshot } from "@/components/area-snapshot";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
  );
}

export async function SaleMapSection({ sale }: { sale: PprPoint }) {
  if (sale.latitude && sale.longitude) {
    return <ClientMapView pprPreview={[sale]} />;
  }
  if (sale.estimatedLatitude && sale.estimatedLongitude) {
    return (
      <div className="relative h-full w-full">
        <ClientMapView pprPreview={[sale]} />
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200 shadow-sm pointer-events-none">
          Estimated Location
        </div>
      </div>
    );
  }
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-lg">?</div>
      <p className="text-[10px] font-bold uppercase tracking-wider">Geocoding Not Available</p>
    </div>
  );
}

export async function SaleHistorySection({ sale }: { sale: PprPoint }) {
  const [candidateHistory] = await Promise.all([
    getRecentPprSales({
      county: sale.county,
      eircode: sale.eircode || undefined,
      locality: sale.eircode ? undefined : sale.address,
      take: 50,
    }),
  ]);

  const addressNumberMatch = sale.address.match(/(?:\b|^)(\d+)(?:\b|[A-Za-z])/);
  const houseNumber = addressNumberMatch ? addressNumberMatch[1] : null;

  const fullHistory = candidateHistory.filter((h) => {
    if (h.id === sale.id) return true;
    if (houseNumber) {
      const hNumberMatch = h.address.match(/(?:\b|^)(\d+)(?:\b|[A-Za-z])/);
      const hNumber = hNumberMatch ? hNumberMatch[1] : null;
      if (hNumber && hNumber !== houseNumber) return false;
    }
    return true;
  });

  const uniqueHistory = fullHistory.filter((s, i, self) =>
    i === self.findIndex((t) => t.saleDate.getTime() === s.saleDate.getTime() && t.priceEur === s.priceEur)
  );

  return (
    <ul className="space-y-4">
      {uniqueHistory.map((h) => (
        <li key={h.id} className="flex justify-between items-start group">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{h.saleDate.getFullYear()}</span>
              {h.descriptionOfProperty.toLowerCase().includes("new") && (
                <span className="text-[8px] font-black bg-blue-500/20 text-blue-400 px-1 rounded uppercase tracking-tighter border border-blue-500/30">New</span>
              )}
            </div>
            <span className="text-[9px] text-slate-500 uppercase">{h.saleDate.toLocaleDateString("en-IE", { month: "short" })}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-black text-slate-200">
              €{h.priceEur.toLocaleString()}
              {h.notFullMarketPrice && <span className="ml-0.5 text-amber-500 text-[10px]">**</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function SaleCrimeSection({ county, locality }: { county: string; locality?: string }) {
  let crimeStats: Awaited<ReturnType<typeof getLocalCrimeStats>> = [];
  try {
    crimeStats = await getLocalCrimeStats(county, locality);
  } catch (error) {
    console.warn("Failed to fetch crime data:", error);
  }
  return <CrimeStatsGrid stats={crimeStats} county={locality || county} />;
}

export async function SaleAreaSection({ routingKey, county }: { routingKey: string; county: string }) {
  let areaStats: Awaited<ReturnType<typeof getSingleEircodeRoutingKeyStats>> = null;
  try {
    areaStats = await getSingleEircodeRoutingKeyStats(routingKey, county);
  } catch (error) {
    console.warn("Failed to fetch area data:", error);
  }
  if (!areaStats) return null;
  return (
    <AreaSnapshot
      routingKey={areaStats.routingKey}
      medianPrice={areaStats.medianPrice}
      volume={areaStats.volume}
      growthPercent={areaStats.growthPercent}
      county={county}
    />
  );
}

export function SaleMapSkeleton() {
  return <Skeleton className="h-full w-full" />;
}

export function SaleHistorySkeleton() {
  return (
    <div className="space-y-4">
      {Array(3).fill(null).map((_, i) => (
        <div key={i} className="flex justify-between animate-pulse">
          <div className="h-8 w-24 bg-slate-200 rounded" />
          <div className="h-8 w-20 bg-slate-200 rounded" />
        </div>
      ))}
    </div>
  );
}

export function SaleCrimeSkeleton() {
  return <Skeleton className="h-[200px]" />;
}

export function SaleAreaSkeleton() {
  return <Skeleton className="h-[120px]" />;
}
