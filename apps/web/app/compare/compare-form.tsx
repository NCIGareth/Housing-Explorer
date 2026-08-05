"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { isEircodeKey } from "@/lib/area";
import { MultiSelect, type MultiSelectOption } from "@/components/multi-select";

export type CompareMode = "index" | "median";

export function CompareForm({
  counties,
  selected,
  mode,
}: {
  counties: string[];
  selected: string[];
  mode: CompareMode;
}) {
  const router = useRouter();
  const [selectedMode, setSelectedMode] = useState<CompareMode>(mode);
  const [selectedCounties, setSelectedCounties] = useState<string[]>(
    selected.filter((a) => !isEircodeKey(a))
  );
  const [selectedEircodes, setSelectedEircodes] = useState<string[]>(
    selected.filter(isEircodeKey)
  );
  const [eircodeOptions, setEircodeOptions] = useState<MultiSelectOption[]>([]);
  const [eircodesLoading, setEircodesLoading] = useState(true);

  useEffect(() => {
    if (selectedMode !== "median") return;
    let cancelled = false;
    setEircodesLoading(true);
    const query = selectedCounties.map((c) => `county=${encodeURIComponent(c)}`).join("&");
    fetch(query ? `/api/eircodes?${query}` : "/api/eircodes")
      .then((res) => res.ok ? res.json() : Promise.reject(new Error(`Failed to load eircodes: ${res.status}`)))
      .then((data: { items: Array<{ key: string; county: string; locality: string }> }) => {
        if (cancelled) return;
        setEircodeOptions(
          data.items.map((item) => ({
            value: item.key,
            label: item.locality && item.locality.toLowerCase() !== item.county.toLowerCase()
              ? `${item.key} — ${item.locality}`
              : item.key,
            group: item.county,
          }))
        );
      })
      .catch((err) => console.error(err))
      .finally(() => {
        if (!cancelled) setEircodesLoading(false);
      });
    return () => { cancelled = true; };
  }, [selectedCounties, selectedMode]);

  const toggle = (county: string) => {
    setSelectedCounties((prev) =>
      prev.includes(county) ? prev.filter((c) => c !== county) : [...prev, county]
    );
  };

  const switchMode = (next: CompareMode) => {
    setSelectedMode(next);
    if (next === "index") setSelectedEircodes([]);
  };

  const totalAreas = selectedMode === "median"
    ? selectedCounties.length + selectedEircodes.length
    : selectedCounties.length;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalAreas < 2) return;
    const areas = selectedMode === "median"
      ? [...selectedCounties, ...selectedEircodes]
      : selectedCounties;
    router.push(`/compare?mode=${selectedMode}&areas=${areas.join(",")}`);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => switchMode("index")}
          className={`flex-1 px-3 py-2 text-sm font-bold rounded-lg border transition-all ${
            selectedMode === "index"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          Official Index
        </button>
        <button
          type="button"
          onClick={() => switchMode("median")}
          className={`flex-1 px-3 py-2 text-sm font-bold rounded-lg border transition-all ${
            selectedMode === "median"
              ? "bg-blue-600 text-white border-blue-600 shadow-sm"
              : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
          }`}
        >
          Median Price
        </button>
      </div>
      <p className="text-xs text-slate-400">
        {selectedMode === "index"
          ? "CSO official index (2015 = 100) — counties only"
          : "PPR median sale price (€, quarterly) — counties and eircode sectors"}
      </p>

      <div className="flex flex-wrap gap-2">
        {counties.map((county) => (
          <button
            key={county}
            type="button"
            onClick={() => toggle(county)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
              selectedCounties.includes(county)
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {county}
          </button>
        ))}
      </div>

      {selectedMode === "median" && (
        <MultiSelect
          name="eircode"
          label="Eircode Sector"
          options={eircodeOptions}
          selected={selectedEircodes}
          placeholder={eircodesLoading ? "Loading…" : "Select eircode sectors…"}
          searchPlaceholder="Search eircode or town…"
          emptyMessage={eircodesLoading ? "Loading…" : "No matching eircodes"}
          onChange={setSelectedEircodes}
        />
      )}

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          {totalAreas < 2
            ? selectedMode === "index"
              ? "Select at least 2 counties to compare"
              : "Select at least 2 areas to compare"
            : `${totalAreas} areas selected`}
        </p>
        <button
          type="submit"
          disabled={totalAreas < 2}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          Compare
        </button>
      </div>
    </form>
  );
}
