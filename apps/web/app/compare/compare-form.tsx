"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CompareForm({ counties, selected }: { counties: string[]; selected: string[] }) {
  const router = useRouter();
  const [selectedAreas, setSelectedAreas] = useState<string[]>(selected);

  const toggle = (county: string) => {
    setSelectedAreas((prev) =>
      prev.includes(county) ? prev.filter((c) => c !== county) : [...prev, county]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedAreas.length < 2) return;
    router.push(`/compare?areas=${selectedAreas.join(",")}`);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm space-y-4">
      <div className="flex flex-wrap gap-2">
        {counties.map((county) => (
          <button
            key={county}
            type="button"
            onClick={() => toggle(county)}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-all ${
              selectedAreas.includes(county)
                ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-300 hover:bg-slate-50"
            }`}
          >
            {county}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <p className="text-xs text-slate-400">
          {selectedAreas.length < 2
            ? "Select at least 2 counties to compare"
            : `${selectedAreas.length} areas selected`}
        </p>
        <button
          type="submit"
          disabled={selectedAreas.length < 2}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
        >
          Compare
        </button>
      </div>
    </form>
  );
}
