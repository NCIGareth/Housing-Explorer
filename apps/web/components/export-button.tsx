"use client";

import { useUser } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function ExportButton() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState(false);

  const params = new URLSearchParams();
  const counties = searchParams.getAll("county");
  const countyList = counties.length > 0 ? counties : ["Dublin"];
  for (const c of countyList) params.append("county", c);
  for (const e of searchParams.getAll("eircode")) params.append("eircode", e);
  const minPriceEur = searchParams.get("minPriceEur");
  const maxPriceEur = searchParams.get("maxPriceEur");
  const propertyType = searchParams.get("propertyType");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");
  const locality = searchParams.get("locality");
  const notFullMarketPrice = searchParams.get("notFullMarketPrice");
  const vatExclusive = searchParams.get("vatExclusive");

  if (minPriceEur) params.set("minPriceEur", minPriceEur);
  if (maxPriceEur) params.set("maxPriceEur", maxPriceEur);
  if (propertyType) params.set("propertyType", propertyType);
  if (startDate) params.set("startDate", startDate);
  if (endDate) params.set("endDate", endDate);
  if (locality) params.set("locality", locality);
  if (notFullMarketPrice) params.set("notFullMarketPrice", notFullMarketPrice);
  if (vatExclusive) params.set("vatExclusive", vatExclusive);
  const housingType = searchParams.get("housingType");
  if (housingType) params.set("housingType", housingType);

  async function handleExport() {
    if (!user) {
      router.push("/auth/signin");
      return;
    }
    setPreparing(true);
    setError(false);
    try {
      const res = await fetch(`/api/export?${params.toString()}`);
      if (!res.ok) throw new Error(`Export failed: ${res.status}`);
      const blob = await res.blob();
      const cd = res.headers.get("content-disposition") ?? "";
      const match = cd.match(/filename="?([^";]+)"?/);
      const filename = match?.[1] ?? "property-sales.csv";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
      setError(true);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleExport}
        disabled={preparing}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
        aria-label="Download search results as CSV"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        {preparing ? "Preparing…" : "Export CSV"}
      </button>
      <span className="text-[11px] text-slate-400">Up to 10,000 most recent records</span>
      {error && <span className="text-xs text-rose-600">Export failed — try again.</span>}
    </div>
  );
}
