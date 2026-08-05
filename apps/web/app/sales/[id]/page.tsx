import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getPropertyById } from "@/lib/queries";
import {
  getGoogleFloorplanSearchUrl,
  getDaftHistorySearchUrl,
  getGoogleMapsUrl,
} from "@/lib/external-links";
import { Suspense } from "react";
import type { PprPoint } from "@/components/market-map-openlayers";
import { SavePropertyButton } from "@/components/save-property-button";
import { CoordinateConfidenceBadge } from "@/components/coordinate-confidence-badge";
import {
  SaleMapSection,
  SaleHistorySection,
  SaleCrimeSection,
  SaleAreaSection,
  SimilarPropertiesSection,
  SaleMapSkeleton,
  SaleHistorySkeleton,
  SaleCrimeSkeleton,
  SaleAreaSkeleton,
} from "./sale-sections";

export const revalidate = 3600;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  if (process.env.NEXT_PHASE === "phase-production-build") return {};

  const { id } = await params;
  const sale = await getPropertyById(id);

  if (!sale) return { title: "Property Not Found | Ireland Housing Explorer" };

  const title = `€${sale.priceEur.toLocaleString()} - ${sale.address}, ${sale.county} | Ireland Housing Explorer`;
  const description = `${sale.descriptionOfProperty} sold for €${sale.priceEur.toLocaleString()} in ${sale.county} on ${sale.saleDate.toLocaleDateString("en-IE", { year: "numeric", month: "long", day: "numeric" })}. Search the full Property Price Register for sold prices in any Irish area.`;

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://irelandhousingexplorer.com";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      siteName: "Ireland Housing Explorer",
    },
    alternates: { canonical: `${baseUrl}/sales/${sale.id}` },
  };
}

export default async function PprSaleDetailPage({ params }: Props) {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return null;
  }

  const { id } = await params;
  const sale = await getPropertyById(id);

  if (!sale) {
    notFound();
  }

  const baseUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "https://irelandhousingexplorer.com";

  const routingKey = (sale.eircode || sale.estimatedEircode)?.substring(0, 3);

  // Extract locality from address for narrowing crime stats (e.g. "Finglas" from "38 Jamestown Road, Finglas, Dublin 11")
  const addressParts = sale.address.split(",").map((p) => p.trim());
  const crimeLocality = addressParts.length >= 3 ? addressParts[addressParts.length - 2] : undefined;
  const vatInclusivePrice = sale.vatExclusive ? Math.round(sale.priceEur * 1.135) : null;
  const errorReportEmail = `info@psr.ie?subject=${encodeURIComponent("Data Error Report: " + sale.address)}&body=${encodeURIComponent("I would like to report an error with the following listing on the Residential Property Price Register.\n\nAddress: " + sale.address + "\nDate of Sale: " + sale.saleDate.toISOString().slice(0, 10) + "\nPrice: €" + sale.priceEur.toLocaleString() + "\n\nDescription of error: ")}`;

  const floorplanUrl = getGoogleFloorplanSearchUrl(sale.address);
  const daftHistoryUrl = getDaftHistorySearchUrl(sale.address);
  const mapsUrl = getGoogleMapsUrl(sale.address, sale.eircode || undefined);

  const saleData: PprPoint = {
    id: sale.id,
    address: sale.address,
    county: sale.county,
    eircode: sale.eircode,
    priceEur: sale.priceEur,
    latitude: sale.latitude,
    longitude: sale.longitude,
    estimatedEircode: sale.estimatedEircode,
    estimatedLatitude: sale.estimatedLatitude,
    estimatedLongitude: sale.estimatedLongitude,
    coordinateConfidence: sale.coordinateConfidence,
    coordinateErrorMeters: sale.coordinateErrorMeters,
  };

  return (
    <main className="max-w-7xl mx-auto p-6 space-y-8 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              { "@type": "ListItem", position: 1, name: "Explorer", item: baseUrl },
              { "@type": "ListItem", position: 2, name: `${sale.address}, ${sale.county}`, item: `${baseUrl}/sales/${sale.id}` },
            ],
          }),
        }}
      />
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
        <div className="flex-1 space-y-6">
          <header>
            <div className="flex items-center gap-3">
              <span className="text-sm font-bold uppercase tracking-widest text-slate-400">Property Information Record</span>
              {sale.notFullMarketPrice && (
                <span className="bg-amber-100 text-amber-700 text-[11px] font-black px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-tighter">
                  ** Non-Market Transaction
                </span>
              )}
            </div>
            <h1 className="text-2xl font-bold mt-2 leading-tight" style={{ whiteSpace: "pre-wrap" }}>
              {sale.address}
            </h1>
            <div className="flex items-baseline gap-2 mt-2">
              <span className="text-3xl font-black text-slate-900">
                €{sale.priceEur.toLocaleString()}
              </span>
              {sale.vatExclusive && (
                <span className="text-sm font-bold text-blue-600 uppercase">Ex-VAT</span>
              )}
              <SavePropertyButton propertyId={sale.id} />
            </div>

            {vatInclusivePrice && (
              <div className="mt-4 p-4 bg-blue-50/50 border border-blue-100 rounded-xl">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-[11px] font-bold text-blue-400 uppercase tracking-widest leading-none">VAT Inclusive Estimate</h4>
                    <p className="text-lg font-black text-blue-700 mt-1">€{vatInclusivePrice.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-blue-500 font-medium leading-tight max-w-[120px]">
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
              <span className="text-slate-400 block uppercase text-[11px] font-bold tracking-widest">Date of Sale</span>
              <span className="font-bold text-slate-900">{sale.saleDate.toLocaleDateString("en-IE", { day: "2-digit", month: "long", year: "numeric" })}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 block uppercase text-[11px] font-bold tracking-widest">County</span>
              <span className="font-bold text-slate-900">{sale.county}</span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 block uppercase text-[11px] font-bold tracking-widest">Postal Code</span>
              <span className="font-bold text-slate-900">
                {sale.eircode ? (
                  sale.eircode
                ) : sale.estimatedEircode ? (
                  <span className="flex items-center gap-1.5">
                    {sale.estimatedEircode}
                    <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-md">
                      Estimated
                    </span>
                  </span>
                ) : (
                  "Not Filed"
                )}
              </span>
            </div>
            <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
              <span className="text-slate-400 block uppercase text-[11px] font-bold tracking-widest">Location Confidence</span>
              <div className="mt-1.5">
                {sale.coordinateConfidence != null ? (
                  <CoordinateConfidenceBadge
                    confidence={sale.coordinateConfidence}
                    errorMeters={sale.coordinateErrorMeters}
                  />
                ) : (
                  <span className="font-bold text-slate-400">Not Geocoded</span>
                )}
              </div>
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

        <aside className="w-full md:w-96 space-y-6">
          <div className="h-[400px] rounded-xl overflow-hidden border shadow-sm relative">
            <Suspense fallback={<SaleMapSkeleton />}>
              <SaleMapSection sale={saleData} />
            </Suspense>
          </div>

          <Suspense fallback={<SaleCrimeSkeleton />}>
            <SaleCrimeSection county={sale.county} locality={crimeLocality} />
          </Suspense>
        </aside>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {routingKey && (
          <Suspense fallback={<SaleAreaSkeleton />}>
            <SaleAreaSection routingKey={routingKey} county={sale.county} />
          </Suspense>
        )}

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-xl" aria-hidden="true">🔍</span>
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-900">Deep Dive Research</h3>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Search for floorplans, listing history, and location on external sites.
              </p>

              <div className="grid grid-cols-1 gap-2 pt-2">
                <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3 py-2.5 bg-violet-50 hover:bg-violet-100 text-violet-700 rounded-xl text-[11px] font-bold transition-all border border-violet-100 group">
                  Google Maps (Street View)
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </a>
                <a href={floorplanUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-[11px] font-bold transition-all border border-blue-100 group">
                  Find Floorplans
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </a>
                <a href={daftHistoryUrl} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between px-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-xl text-[11px] font-bold transition-all border border-slate-100 group">
                  Listing History (Daft)
                  <span className="opacity-0 group-hover:opacity-100 transition-opacity">↗</span>
                </a>
              </div>
            </div>

            <div className="bg-slate-900 p-5 rounded-2xl shadow-xl space-y-4">
              <h3 className="text-[11px] font-bold uppercase tracking-[0.2em] text-slate-500">Sales History on Record</h3>
              <Suspense fallback={<SaleHistorySkeleton />}>
                <SaleHistorySection sale={saleData} />
              </Suspense>
            </div>

            <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-2xl" />}>
              <SimilarPropertiesSection address={sale.address} county={sale.county} excludeId={sale.id} />
            </Suspense>
          </div>

      <footer className="pt-12 border-t border-slate-100">
        <div className="bg-slate-50 rounded-2xl p-6 text-xs text-slate-500 leading-relaxed border border-slate-100">
          <p className="font-bold text-slate-900 mb-2 uppercase tracking-widest text-[11px]">Registry Disclaimer</p>
          <p>
            The Residential Property Price Register is produced by the PSRA pursuant to section 86 of the Property Services (Regulation) Act 2011.
            It is based on details filed for stamp duty purposes. The Authority does not edit this data and is not responsible for errors.
            It is important to note that the Register is not intended as a &ldquo;Property Price Index&rdquo;.
            Records may include multi-unit sales or partial price declarations.
          </p>
        </div>
      </footer>
    </main>
  );
}
