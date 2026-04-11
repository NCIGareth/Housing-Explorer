"use client";

import React, { useState } from "react";

type Props = {
  county?: string;
  eircode?: string;
  minPriceEur?: number;
  maxPriceEur?: number;
  propertyType?: string;
  startDate?: string;
  endDate?: string;
  locality?: string;
  notFullMarketPrice?: boolean;
  vatExclusive?: boolean;
};

const COUNTIES = [
  "Carlow", "Cavan", "Clare", "Cork", "Donegal", "Dublin", "Galway", "Kerry",
  "Kildare", "Kilkenny", "Laois", "Leitrim", "Limerick", "Longford", "Louth",
  "Mayo", "Meath", "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary",
  "Waterford", "Westmeath", "Wexford", "Wicklow"
];

const PRICE_PRESETS = [
  { label: "Under €300k", min: 0, max: 300000 },
  { label: "€300k - €500k", min: 300000, max: 500000 },
  { label: "€500k - €1M", min: 500000, max: 1000000 },
  { label: "Over €1M", min: 1000000, max: "" },
];

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
  county,
  eircode,
  minPriceEur,
  maxPriceEur,
  propertyType,
  startDate,
  endDate,
  locality,
  notFullMarketPrice,
  vatExclusive
}: Props) {
  const [minPrice, setMinPrice] = useState(minPriceEur?.toString() ?? "");
  const [maxPrice, setMaxPrice] = useState(maxPriceEur?.toString() ?? "");

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
        <a href="/" style={{ fontSize: "12px", color: "#2563eb", textDecoration: "none" }}>Reset</a>
      </div>

      <form method="get" action="/" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        
        {/* Main Grid */}
        <div style={{ display: "grid", gap: "16px", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))" }}>
          <div>
            <label htmlFor="county" style={labelStyle}>County</label>
            <select id="county" name="county" defaultValue={county ?? "Dublin"} style={inputStyle}>
              {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="minPriceEur" style={labelStyle}>Min Price (€)</label>
            <input
              id="minPriceEur"
              name="minPriceEur"
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
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
              onChange={(e) => setMaxPrice(e.target.value)}
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
              defaultValue={startDate ?? ""} 
              style={inputStyle} 
            />
          </div>

          <div>
            <label htmlFor="endDate" style={labelStyle}>Sale Date (To)</label>
            <input 
              type="date" 
              id="endDate" 
              name="endDate" 
              defaultValue={endDate ?? ""} 
              style={inputStyle} 
            />
          </div>
        </div>

        {/* Presets */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {PRICE_PRESETS.map(preset => (
            <button
              key={preset.label}
              type="button"
              onClick={() => {
                setMinPrice(preset.min.toString());
                setMaxPrice(preset.max.toString());
              }}
              style={{
                padding: "6px 12px",
                backgroundColor: "#fff",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.2s"
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
            <label htmlFor="locality" style={labelStyle}>Area / Town</label>
            <input id="locality" name="locality" defaultValue={locality ?? ""} placeholder="e.g. Malahide" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="eircode" style={labelStyle}>Eircode Sector</label>
            <input id="eircode" name="eircode" defaultValue={eircode ?? ""} placeholder="e.g. D14" style={inputStyle} />
          </div>
          <div>
            <label htmlFor="propertyType" style={labelStyle}>Property Type</label>
            <select id="propertyType" name="propertyType" defaultValue={propertyType ?? ""} style={inputStyle}>
              <option value="">All Types</option>
              <option value="Second-Hand Dwelling house /Apartment">Second-Hand</option>
              <option value="New Dwelling house /Apartment">New Build</option>
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
            boxShadow: "0 4px 6px -1px rgba(37, 99, 235, 0.2)"
          }}
        >
          Update Explorer
        </button>
      </form>
    </section>
  );
});