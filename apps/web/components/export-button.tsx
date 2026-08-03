"use client";

import { useSearchParams } from "next/navigation";

export function ExportButton() {
  const searchParams = useSearchParams();

  const params = new URLSearchParams();
  const county = searchParams.get("county") ?? "Dublin";
  const eircode = searchParams.get("eircode");
  const minPriceEur = searchParams.get("minPriceEur");
  const maxPriceEur = searchParams.get("maxPriceEur");
  const propertyType = searchParams.get("propertyType");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const locality = searchParams.get("locality");
  const notFullMarketPrice = searchParams.get("notFullMarketPrice");
  const vatExclusive = searchParams.get("vatExclusive");

  params.set("county", county);
  if (eircode) params.set("eircode", eircode);
  if (minPriceEur) params.set("minPriceEur", minPriceEur);
  if (maxPriceEur) params.set("maxPriceEur", maxPriceEur);
  if (propertyType) params.set("propertyType", propertyType);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (locality) params.set("locality", locality);
  if (notFullMarketPrice) params.set("notFullMarketPrice", notFullMarketPrice);
  if (vatExclusive) params.set("vatExclusive", vatExclusive);

  const href = `/api/export?${params.toString()}`;

  return (
    <a
      href={href}
      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 transition-colors"
      aria-label="Download search results as CSV"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      Export CSV
    </a>
  );
}
