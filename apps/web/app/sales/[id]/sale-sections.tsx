import Link from "next/link";
import type { PprPoint } from "@/components/market-map-openlayers";
import { getLocalCrimeStats, getRecentPprSales, getSimilarProperties, getSingleEircodeRoutingKeyStats } from "@/lib/queries";
import ClientMapView from "@/components/client-map-view";
import { CrimeStatsGrid } from "@/components/crime-stats-grid";
import { AreaSnapshot } from "@/components/area-snapshot";

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-slate-100 rounded-2xl ${className}`} />
  );
}

function ErrorNotice({ children }: { children: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
      {children}
    </div>
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
        <div className="absolute bottom-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider text-amber-600 border border-amber-200 shadow-sm pointer-events-none">
          Estimated Location
        </div>
      </div>
    );
  }
  return (
    <div className="h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-2">
      <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-lg">?</div>
      <p className="text-[11px] font-bold uppercase tracking-wider">Geocoding Not Available</p>
    </div>
  );
}

export async function SaleHistorySection({ sale }: { sale: PprPoint }) {
  let error = false;
  let candidateHistory: Awaited<ReturnType<typeof getRecentPprSales>> = [];
  try {
    [candidateHistory] = await Promise.all([
      getRecentPprSales({
        county: sale.county,
        eircode: sale.eircode || undefined,
        locality: sale.eircode ? undefined : sale.address,
        take: 50,
      }),
    ]);
  } catch (e) {
    error = true;
    console.error("Failed to fetch sales history:", e);
  }

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

  if (error) {
    return (
      <ErrorNotice>
        Couldn&apos;t load sales history for this address — please try again.
      </ErrorNotice>
    );
  }

  return (
    <ul className="space-y-4">
      {uniqueHistory.map((h) => (
        <li key={h.id} className="flex justify-between items-start group">
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{h.saleDate.getFullYear()}</span>
              {h.descriptionOfProperty.toLowerCase().includes("new") && (
                <span className="text-[11px] font-black bg-blue-500/20 text-blue-400 px-1 rounded uppercase tracking-tighter border border-blue-500/30">New</span>
              )}
            </div>
            <span className="text-[11px] text-slate-500 uppercase">{h.saleDate.toLocaleDateString("en-IE", { month: "short" })}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="font-black text-slate-200">
              €{h.priceEur.toLocaleString()}
              {h.notFullMarketPrice && <span className="ml-0.5 text-amber-500 text-[11px]">**</span>}
            </span>
          </div>
        </li>
      ))}
    </ul>
  );
}

export async function SaleCrimeSection({ county, locality }: { county: string; locality?: string }) {
  let crimeStats: Awaited<ReturnType<typeof getLocalCrimeStats>> = [];
  let label = county;
  let error = false;
  try {
    // Try locality first (e.g. "Finglas"), fall back to county-wide
    if (locality) {
      crimeStats = await getLocalCrimeStats(county, locality);
      if (crimeStats.length > 0) label = locality;
    }
    if (crimeStats.length === 0) {
      crimeStats = await getLocalCrimeStats(county);
    }
  } catch (e) {
    error = true;
    console.error("Failed to fetch crime data:", e);
  }
  if (error) {
    return (
      <ErrorNotice>
        Couldn&apos;t load crime data — please try again.
      </ErrorNotice>
    );
  }
  return <CrimeStatsGrid stats={crimeStats} county={label} />;
}

export async function SaleAreaSection({ routingKey, county }: { routingKey: string; county: string }) {
  let areaStats: Awaited<ReturnType<typeof getSingleEircodeRoutingKeyStats>> = null;
  let error = false;
  try {
    areaStats = await getSingleEircodeRoutingKeyStats(routingKey, county);
  } catch (e) {
    error = true;
    console.error("Failed to fetch area data:", e);
  }
  if (error) {
    return (
      <ErrorNotice>
        Couldn&apos;t load area snapshot — please try again.
      </ErrorNotice>
    );
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

export async function SimilarPropertiesSection({ address, county, excludeId }: { address: string; county: string; excludeId: string }) {
  let similar: Awaited<ReturnType<typeof getSimilarProperties>> = [];
  let error = false;
  try {
    similar = await getSimilarProperties(address, county, excludeId);
  } catch (e) {
    error = true;
    console.error("Failed to fetch similar properties:", e);
  }

  if (error) {
    return (
      <ErrorNotice>
        Couldn&apos;t load similar properties — please try again.
      </ErrorNotice>
    );
  }

  if (similar.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-bold flex items-center gap-2">
        <span className="w-2 h-2 bg-blue-500 rounded-full" />
        Similar Properties on This Street
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {similar.map((p) => (
          <Link key={p.id} href={`/sales/${p.id}`} className="block p-4 bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md hover:border-blue-300 transition-all no-underline">
            <p className="text-xs text-slate-500 font-medium leading-snug line-clamp-2 mb-2" title={p.address}>
              {p.address}
            </p>
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-sm">
                €{p.priceEur.toLocaleString()}
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                {p.saleDate.getFullYear()}
              </span>
            </div>
            {p.descriptionOfProperty && (
              <p className="text-[11px] text-slate-400 mt-1 truncate">{p.descriptionOfProperty}</p>
            )}
          </Link>
        ))}
      </div>
    </section>
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
