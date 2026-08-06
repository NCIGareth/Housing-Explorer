"use client";

import React, { useTransition, useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MultiSelect, type MultiSelectOption } from "./multi-select";

type Props = {
  counties: string[];
  eircodes?: string[];
  minPriceEur?: number;
  maxPriceEur?: number;
  propertyType?: string;
  startDate?: string;
  endDate?: string;
  localities?: string[];
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
  housingType?: "house" | "apartment";
};

const COUNTY_GROUPS: Array<{ province: string; counties: string[] }> = [
  { province: "Leinster", counties: ["Carlow", "Dublin", "Kildare", "Kilkenny", "Laois", "Longford", "Louth", "Meath", "Offaly", "Westmeath", "Wexford", "Wicklow"] },
  { province: "Munster", counties: ["Clare", "Cork", "Kerry", "Limerick", "Tipperary", "Waterford"] },
  { province: "Connacht", counties: ["Galway", "Leitrim", "Mayo", "Roscommon", "Sligo"] },
  { province: "Ulster", counties: ["Cavan", "Donegal", "Monaghan"] },
];

const COUNTY_OPTIONS: MultiSelectOption[] = COUNTY_GROUPS.flatMap((g) =>
  g.counties.map((c) => ({ value: c, label: c, group: g.province }))
);

const PRICE_PRESETS = [
  { label: "Under €300k", min: 0, max: 300000 },
  { label: "€300k - €500k", min: 300000, max: 500000 },
  { label: "€500k - €1M", min: 500000, max: 1000000 },
  { label: "Over €1M", min: 1000000, max: "" },
];

const DATE_PRESETS = [
  { label: "Last 3 months", months: 3 },
  { label: "Last 6 months", months: 6 },
  { label: "Last 9 months", months: 9 },
  { label: "Last 12 months", months: 12 },
];

function monthsAgoISO(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - months);
  return d.toISOString().split("T")[0];
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: 6,
  fontSize: "11px",
  fontWeight: 700,
  textTransform: "uppercase",
  color: "#64748b",
  letterSpacing: "0.5px"
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px",
  borderRadius: "8px",
  border: "1px solid #e2e8f0",
  fontSize: "14px",
  backgroundColor: "#fff",
  outline: "none"
};

export const FilterPanel = React.memo(function FilterPanel({
  counties,
  eircodes,
  minPriceEur,
  maxPriceEur,
  propertyType,
  startDate,
  endDate,
  localities,
  notFullMarketPrice,
  vatExclusive,
  housingType
}: Props) {
  const [minPrice, setMinPrice] = useState(minPriceEur?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(maxPriceEur?.toString() ?? "");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [startDateState, setStartDateState] = useState(startDate ?? "");
  const [endDateState, setEndDateState] = useState(endDate ?? "");
  const [activeDatePreset, setActiveDatePreset] = useState<string | null>(null);
  const [localityText, setLocalityText] = useState((localities ?? []).join(", "));
  const [countyState, setCountyState] = useState<string[]>(counties);
  const [eircodeOptions, setEircodeOptions] = useState<MultiSelectOption[]>([]);
  const [eircodesLoading, setEircodesLoading] = useState(true);
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    setEircodesLoading(true);
    const query = countyState.map((c) => `county=${encodeURIComponent(c)}`).join("&");
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
  }, [countyState]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const params = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      if (typeof value === "string" && value.trim() !== "") {
        params.append(key, value);
      }
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `/?${qs}` : "/");
    });
  }

  function handlePresetClick(label: string, min: number | "", max: number | string) {
    setActivePreset(label);
    setMinPrice(min.toString());
    setMaxPrice(max.toString());
  }

  function handleMinChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMinPrice(e.target.value);
    setActivePreset(null);
  }

  function handleMaxChange(e: React.ChangeEvent<HTMLInputElement>) {
    setMaxPrice(e.target.value);
    setActivePreset(null);
  }

  function handleDatePresetClick(label: string, months: number) {
    setActiveDatePreset(label);
    setStartDateState(monthsAgoISO(months));
    setEndDateState("");
  }

  function handleStartDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setStartDateState(e.target.value);
    setActiveDatePreset(null);
  }

  function handleEndDateChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEndDateState(e.target.value);
    setActiveDatePreset(null);
  }

  return (
    <section style={{ 
      backgroundColor: "#f8fafc", 
      padding: "24px", 
      borderRadius: "16px", 
      border: "1px solid #e2e8f0",
      boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>Search Filters</h3>
        <Link href="/" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none" }}>Reset</Link>
      </div>

      <form method="get" action="/" onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Main Grid */}
        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <MultiSelect
              name="county"
              label="Counties"
              options={COUNTY_OPTIONS}
              selected={counties}
              placeholder="Select counties…"
              searchPlaceholder="Search counties…"
              onChange={setCountyState}
            />
          </div>

          <div>
            <label htmlFor="minPriceEur" style={labelStyle}>Min Price (€)</label>
              <input
                id="minPriceEur"
                name="minPriceEur"
                type="number"
                value={minPrice}
                onChange={handleMinChange}
                placeholder="0"
                style={inputStyle}
              />
          </div>

          <div>
            <label htmlFor="maxPriceEur" style={labelStyle}>Max Price (€)</label>
              <input
                id="maxPriceEur"
                name="maxPriceEur"
                type="number"
                value={maxPrice}
                onChange={handleMaxChange}
                placeholder="No limit"
                style={inputStyle}
              />
          </div>

          <div>
            <label htmlFor="startDate" style={labelStyle}>Sale Date (From)</label>
            <input 
              type="date" 
              id="startDate" 
              name="startDate" 
              value={startDateState}
              onChange={handleStartDateChange}
              style={inputStyle} 
            />
          </div>

          <div>
            <label htmlFor="endDate" style={labelStyle}>Sale Date (To)</label>
            <input 
              type="date" 
              id="endDate" 
              name="endDate" 
              value={endDateState}
              onChange={handleEndDateChange}
              style={inputStyle} 
            />
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PRICE_PRESETS.map((preset: typeof PRICE_PRESETS[0]) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handlePresetClick(preset.label, preset.min, preset.max)}
              style={{
                padding: "6px 14px",
                backgroundColor: activePreset === preset.label ? "#2563eb" : "#fff",
                color: activePreset === preset.label ? "#fff" : "#334155",
                border: activePreset === preset.label ? "1px solid #2563eb" : "1px solid #e2e8f0",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: activePreset === preset.label ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (activePreset !== preset.label) {
                  e.currentTarget.style.backgroundColor = "#f1f5f9";
                }
              }}
              onMouseLeave={(e) => {
                if (activePreset !== preset.label) {
                  e.currentTarget.style.backgroundColor = "#fff";
                }
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Date Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", alignItems: "center" }}>
          <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
            Quick date range
          </span>
          {DATE_PRESETS.map((preset: typeof DATE_PRESETS[0]) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => handleDatePresetClick(preset.label, preset.months)}
              style={{
                padding: "6px 14px",
                backgroundColor: activeDatePreset === preset.label ? "#2563eb" : "#fff",
                color: activeDatePreset === preset.label ? "#fff" : "#334155",
                border: activeDatePreset === preset.label ? "1px solid #2563eb" : "1px solid #e2e8f0",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: activeDatePreset === preset.label ? 700 : 500,
                cursor: "pointer",
                transition: "all 0.15s ease"
              }}
              onMouseEnter={(e) => {
                if (activeDatePreset !== preset.label) {
                  e.currentTarget.style.backgroundColor = "#f1f5f9";
                }
              }}
              onMouseLeave={(e) => {
                if (activeDatePreset !== preset.label) {
                  e.currentTarget.style.backgroundColor = "#fff";
                }
              }}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Secondary Info */}
        <div style={{ 
          display: "grid", 
          gap: "16px", 
          gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))",
          borderTop: "1px solid #e2e8f0",
          paddingTop: "20px"
        }}>
          <div>
            <label htmlFor="locality" style={labelStyle}>Areas / Towns</label>
            <input
              id="locality"
              name="locality"
              type="text"
              value={localityText}
              onChange={(e) => setLocalityText(e.target.value)}
              placeholder="e.g. Malahide, Swords"
              style={inputStyle}
            />
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "#94a3b8" }}>Separate multiple areas with commas</p>
          </div>
          <div>
            <MultiSelect
              name="eircode"
              label="Eircode Sector"
              options={eircodeOptions}
              selected={eircodes ?? []}
              placeholder={eircodesLoading ? "Loading…" : "Select eircodes…"}
              searchPlaceholder="Search eircode or town…"
              emptyMessage={eircodesLoading ? "Loading…" : "No matching eircodes"}
            />
          </div>
          <div>
            <label htmlFor="propertyType" style={labelStyle}>Property Type</label>
            <select id="propertyType" name="propertyType" defaultValue={propertyType ?? ""} style={inputStyle}>
              <option value="">All Types</option>
              <option value="Second-Hand Dwelling house /Apartment">Second-Hand</option>
              <option value="New Dwelling house /Apartment">New Build</option>
            </select>
          </div>
          <div>
            <label htmlFor="housingType" style={labelStyle}>Housing Type</label>
            <select id="housingType" name="housingType" defaultValue={housingType ?? ""} style={inputStyle}>
              <option value="">All Housing</option>
              <option value="house">Houses</option>
              <option value="apartment">Apartments / Flats</option>
            </select>
          </div>
        </div>

        {/* Checkboxes */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "24px", paddingTop: "10px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
            <input type="checkbox" name="notFullMarketPrice" value="on" defaultChecked={notFullMarketPrice} />
            Include Non-Market Price
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px" }}>
            <input type="checkbox" name="vatExclusive" value="on" defaultChecked={vatExclusive} />
            Exclude VAT
          </label>
        </div>

        <button
          type="submit"
          disabled={isPending}
          style={{
            width: "100%",
            padding: "14px",
            backgroundColor: "#2563eb",
            color: "white",
            border: "none",
            borderRadius: "12px",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)",
            opacity: isPending ? 0.7 : 1
          }}
        >
          {isPending ? "Updating…" : "Update Explorer"}
        </button>
      </form>
    </section>
  );
});
