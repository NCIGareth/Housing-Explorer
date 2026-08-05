"use client";

import { useUser } from "@/components/auth-provider";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

export function SaveSearchButton() {
  const { user } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");

  const counties = searchParams.getAll("county").length > 0 ? searchParams.getAll("county") : ["Dublin"];
  const county = counties.join(", ");
  const minPriceEur = searchParams.get("minPriceEur");
  const maxPriceEur = searchParams.get("maxPriceEur");

  const toK = (v: string) => `€${Math.round(parseInt(v, 10) / 1000)}k`;

  let name: string;
  if (minPriceEur && maxPriceEur) name = `${county} ${toK(minPriceEur)}-${toK(maxPriceEur)}`;
  else if (minPriceEur) name = `${county} from ${toK(minPriceEur)}`;
  else if (maxPriceEur) name = `${county} up to ${toK(maxPriceEur)}`;
  else name = county === "Dublin" ? "Ireland property sales" : county;

  async function handleClick() {
    if (!user) {
      router.push("/auth/signin");
      return;
    }
    setSubmitting(true);
    setStatus("idle");
    try {
      const body: Record<string, unknown> = { name };
      if (county) body.county = county;
      if (minPriceEur) body.minPriceEur = parseInt(minPriceEur, 10);
      if (maxPriceEur) body.maxPriceEur = parseInt(maxPriceEur, 10);

      const res = await fetch("/api/saved-searches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`Failed to save search: ${res.status}`);
      const { item } = await res.json();

      const alertRes = await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ savedSearchId: item.id, type: "NEW_LISTING_MATCH" }),
      });
      if (!alertRes.ok) throw new Error(`Failed to create alert: ${alertRes.status}`);

      setStatus("saved");
    } catch (err) {
      console.error("Failed to save search:", err);
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={submitting}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors"
        aria-label="Save current search as an email alert"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {submitting ? "Saving…" : "Save as alert"}
      </button>
      {status === "saved" && <span className="text-xs text-emerald-600">Saved — we&apos;ll email you monthly</span>}
      {status === "error" && <span className="text-xs text-rose-600">Couldn&apos;t save alert. Try again.</span>}
    </div>
  );
}
