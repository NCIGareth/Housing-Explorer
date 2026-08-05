"use client";

import Link from "next/link";

type Props = {
  searchParams?: Record<string, string | string[] | undefined>;
};

function fmt(v: string | string[] | undefined): string | undefined {
  if (v === undefined || v === "") return undefined;
  return Array.isArray(v) ? v[0] : v;
}

function fmtAll(v: string | string[] | undefined): string[] {
  if (v === undefined) return [];
  const vals = Array.isArray(v) ? v : [v];
  return vals.filter((x) => x !== undefined && x !== "");
}

function fmtPrice(v: string): string {
  return `€${Number(v).toLocaleString()}`;
}

export function ActiveFilterChips({ searchParams = {} }: Props) {
  const chips: Array<{ label: string; key: string }> = [];

  const eircodes = fmtAll(searchParams.eircode);
  const locality = fmt(searchParams.locality);
  const minPriceEur = fmt(searchParams.minPriceEur);
  const maxPriceEur = fmt(searchParams.maxPriceEur);
  const propertyType = fmt(searchParams.propertyType);
  const startDate = fmt(searchParams.startDate);
  const endDate = fmt(searchParams.endDate);
  const notFullMarketPrice = fmt(searchParams.notFullMarketPrice);
  const vatExclusive = fmt(searchParams.vatExclusive);

  if (minPriceEur && minPriceEur !== "0") chips.push({ label: `From ${fmtPrice(minPriceEur)}`, key: "minPriceEur" });
  if (maxPriceEur) chips.push({ label: `Up to ${fmtPrice(maxPriceEur)}`, key: "maxPriceEur" });
  if (eircodes.length > 0) chips.push({ label: `Eircode: ${eircodes.join(", ")}`, key: "eircode" });
  if (locality) chips.push({ label: `Areas: ${locality}`, key: "locality" });
  if (propertyType) chips.push({ label: propertyType.includes("New") ? "New build" : "Second-hand", key: "propertyType" });
  if (startDate) chips.push({ label: `From ${startDate}`, key: "startDate" });
  if (endDate) chips.push({ label: `To ${endDate}`, key: "endDate" });
  if (notFullMarketPrice) chips.push({ label: "Non-market price", key: "notFullMarketPrice" });
  if (vatExclusive) chips.push({ label: "Ex-VAT", key: "vatExclusive" });

  const counties = fmtAll(searchParams.county);
  const visibleCounties = counties.length === 1 && counties[0] === "Dublin" ? [] : counties;
  if (visibleCounties.length > 0) {
    chips.unshift({ label: visibleCounties.join(" + "), key: "county" });
  }

  if (chips.length === 0) return null;

  function hrefWithout(key: string) {
    const parts: string[] = [];
    for (const [k, v] of Object.entries(searchParams)) {
      if (k === key || v === undefined) continue;
      const vals = Array.isArray(v) ? v : [v];
      for (const vv of vals) {
        if (vv === undefined || vv === "") continue;
        parts.push(`${encodeURIComponent(k)}=${encodeURIComponent(vv)}`);
      }
    }
    return parts.length > 0 ? `/?${parts.join("&")}` : "/";
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-slate-100 bg-slate-50/50">
      <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Filters</span>
      {chips.map((c) => (
        <Link
          key={c.key}
          href={hrefWithout(c.key)}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-full px-2.5 py-0.5 hover:bg-slate-100 hover:border-slate-300 transition-colors no-underline"
          title={`Remove ${c.label} filter`}
        >
          {c.label}
          <span className="text-slate-400 font-bold" aria-hidden="true">×</span>
        </Link>
      ))}
    </div>
  );
}
