import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getLocalCrimeStats } from "@/lib/queries";
import ClientMapView from "@/components/client-map-view";
import { CrimeStatsGrid } from "@/components/crime-stats-grid";
import { 
  getGoogleFloorplanSearchUrl, 
  getDaftHistorySearchUrl, 
  getPlanningMapUrl, 
  getSeaiBerRegisterUrl,
  getGoogleMapsUrl
} from "@/lib/external-links";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ id: string }> };

export default async function PprSaleDetailPage({ params }: Props) {
  const { id } = await params;
  
  // 1. Fetch the specific sale
  const sale = await prisma.propertySale.findUnique({ where: { id } });

  if (!sale) {
    notFound();
  }

  // 2. Normalize and fetch related data (History + Live Listing)
  // Our database now uses the standard "XXX XXXX" format with a space.
  const normalizedEircode = sale.eircode;

  const [candidateHistory, crimeStats] = await Promise.all([
    normalizedEircode 
      ? prisma.propertySale.findMany({
          where: { eircode: normalizedEircode },
          orderBy: { saleDate: 'desc' }
        })
      : prisma.propertySale.findMany({
          where: { address: sale.address, county: sale.county },
          orderBy: { saleDate: 'desc' }
        }),
    getLocalCrimeStats(sale.county)
  ]);

  // Clean the history to remove false positives from "Developer Shared Eircodes"
  // If the target address has a number (e.g. "11 Longview"), we must enforce that the history also contains that number.
  const addressNumberMatch = sale.address.match(/(?:\b|^)(\d+)(?:\b|[A-Za-z])/);
  const houseNumber = addressNumberMatch ? addressNumberMatch[1] : null;

  const fullHistory = candidateHistory.filter((h: typeof candidateHistory[0]) => {
    if (h.id === sale.id) return true;
    
    // If both have numbers at the start of their text, they must match
    if (houseNumber) {
      const hNumberMatch = h.address.match(/(?:\b|^)(\d+)(?:\b|[A-Za-z])/);
      const hNumber = hNumberMatch ? hNumberMatch[1] : null;
      if (hNumber && hNumber !== houseNumber) {
        return false; // Very likely a different house sharing the Eircode
      }
    }
    return true;
  });

  const floorplanUrl = getGoogleFloorplanSearchUrl(sale.address);
  const daftHistoryUrl = getDaftHistorySearchUrl(sale.address);
  const mapsUrl = getGoogleMapsUrl(sale.address, sale.eircode || undefined);
  const planningUrl = getPlanningMapUrl(sale.address, sale.county);
  const berUrl = getSeaiBerRegisterUrl();

  const vatInclusivePrice = sale.vatExclusive ? Math.round(sale.priceEur * 1.135) : null;
  const errorReportEmail = `info@psr.ie?subject=Data Error Report: ${sale.address}&body=I would like to report an error with the following listing on the Residential Property Price Register.%0D%0A%0D%0AAddress: ${sale.address}%0D%0ADate of Sale: ${sale.saleDate.toISOString().slice(0, 10)}%0D%0APrice: €${sale.priceEur.toLocaleString()}%0D%0A%0D%0ADescription of error: `;

  return (
    <main className="max-w-5xl mx-auto p-6 space-y-8 min-h-screen">
      <nav className="flex items-center gap-2 text-sm text-slate-500 mb-4 transition-colors">
        <Link href="/" className="flex items-center gap-1.5 hover:text-blue-600 font-medium group">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 group-hover:bg-blue-50 transition-colors">
            ←
          </span>
          Back to Explorer
        </Link>
        <span className="text-slate-300">/</span>
        <span className="text-slate-400 truncate">Sale Detail</span>
      </nav>

      <div className="flex flex-col md:flex-row gap-8">
        
        {/* Left Column: Sale Details */}
        <div className="flex-1 space-y-6">
          <header>
            <div className="flex items-center gap-3">
              <h1 className="text-sm font-bold uppercase tracking-widest text-slate-400">Property Information Record</h1>
              {sale.notFullMarketPrice && (
                <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-tighter">
                  ** Non-Market Transaction
                </span>
              )}
            </div>
            <h2 className="text-2xl font-bold mt-2 leading-tight" style={{ whiteSpace: "pre-wrap" }}>
              {sale.address}
            </h2>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900">
                €{sale.priceEur.toLocaleString()}
              </span>
              {sale.vatExclusive && (
                <span className="text-sm font-bold text-blue-600 uppercase">Ex-VAT</span>
              )}
            </div>

            {vatInclusivePrice && (
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[10px] font-bold text-blue-400 uppercase tracking-widest leading-none">VAT Inclusive Estimate</h4>
                    <p className="text-lg font-black text-blue-700 mt-1">€{vatInclusivePrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] text-blue-500 font-medium leading-tight max-w-[120px]">
                      Estimate based on official 13.5% VAT rate for new properties.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </header>

          {sale.notFullMarketPrice && (
            <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-xs text-amber-800 leading-relaxed">
              <p className="font-bold flex items-center gap-2 mb-1">
                ⚠️ Information Note on Price
              </p>
              Prices marked ** do not represent the full market price for a variety of reasons (e.g. family transfers, multi-unit sales, or legal settlements).
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 block uppercase text-[10px] font-bold tracking-widest">Date of Sale</span>
              <span className="font-bold text-slate-900">{sale.saleDate.toLocaleDateString('en-IE', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 block uppercase text-[10px] font-bold tracking-widest">County</span>
              <span className="font-bold text-slate-900">{sale.county}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 block uppercase text-[10px] font-bold tracking-widest">Postal Code</span>
              <span className="font-bold text-slate-900">{sale.eircode || "Not Filed"}</span>
            </div>
          </div>

          <div className="pt-4">
            <a 
              href={`mailto:${errorReportEmail}`}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-50 transition-colors"
            >
              🚩 Report Data Error to PSRA
            </a>
          </div>
        </div>

        {/* Right Column: Map & Insights Sidebar */}
        <aside className="w-full md:w-80 space-y-6">
          <div className="h-64 rounded-xl overflow-hidden border shadow-sm relative">
            {sale.latitude && sale.longitude ? (
              <ClientMapView pprPreview={[sale]} />
            ) : (
              <div className="h-full bg-slate-50 flex flex-col items-center justify-center text-slate-400 p-8 text-center gap-2">
                <div className="w-8 h-8 rounded-full border-2 border-slate-200 flex items-center justify-center text-lg">?</div>
                <p className="text-[10px] font-bold uppercase tracking-wider">Geocoding Not Available</p>
              </div>
            )}
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xl">🔍</span>
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Deep Dive Research</h3>
            </div>
            <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
              Bridge to external records for floor area, room counts, and planning history.
            </p>
            
            <div className="grid grid-cols-1 gap-2 pt-2">
              <a href={mapsUrl} target="_blank" className="flex items-center justify-between px-3 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-[11px] font-bold transition-all border border-violet-100 group">
                Google Maps (Street View)
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
              </a>
              <a href={floorplanUrl} target="_blank" className="flex items-center justify-between px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold transition-all border border-blue-100 group">
                Find Floorplans
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
              </a>
              <a href={daftHistoryUrl} target="_blank" className="flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition-all border border-slate-100 group">
                Listing History (Daft)
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
              </a>
              <a href={berUrl} target="_blank" className="flex items-center justify-between px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl text-[11px] font-bold transition-all border border-emerald-100 group">
                SEAI BER Register
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
              </a>
              <a href={planningUrl} target="_blank" className="flex items-center justify-between px-3 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-[11px] font-bold transition-all border border-amber-100 group">
                Planning Map (MyPlan)
                <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
              </a>
            </div>
          </div>
          
          <div className="bg-slate-900 p-5 rounded-2xl shadow-xl space-y-4">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Sales History on Record</h3>
            <ul className="space-y-4">
              {fullHistory.map((h: typeof fullHistory[0]) => (
                <li key={h.id} className="flex justify-between items-center group">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">{h.saleDate.getFullYear()}</span>
                    <span className="text-[9px] text-slate-500 uppercase">{h.saleDate.toLocaleDateString('en-IE', { month: 'short' })}</span>
                  </div>
                  <span className="font-black text-slate-200">€{h.priceEur.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>

          <CrimeStatsGrid stats={crimeStats} county={sale.county} />
        </aside>
      </div>

      <footer className="pt-12 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-6 text-xs text-slate-500 leading-relaxed border border-slate-100">
          <p className="font-bold text-slate-900 mb-2 uppercase tracking-widest text-[10px]">Registry Disclaimer</p>
          <p>
            The Residential Property Price Register is produced by the PSRA pursuant to section 86 of the Property Services (Regulation) Act 2011. 
            It is based on details filed for stamp duty purposes. The Authority does not edit this data and is not responsible for errors. 
            It is important to note that the Register is not intended as a "Property Price Index". 
            Records may include multi-unit sales or partial price declarations.
          </p>
        </div>
      </footer>
    </main>
  );
}
