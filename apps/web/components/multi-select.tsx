"use client";

import { useEffect, useMemo, useRef, useState } from "react";

export type MultiSelectOption = {
  value: string;
  label: string;
  group?: string;
};

type Props = {
  name: string;
  label: string;
  options: MultiSelectOption[];
  selected: string[];
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
};

export function MultiSelect({
  name,
  label,
  options,
  selected,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyMessage = "No matching options",
}: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [values, setValues] = useState<string[]>(selected);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onClickOutside);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const grouped = useMemo(() => {
    const filtered = options.filter((o) =>
      search.trim() === "" || o.label.toLowerCase().includes(search.trim().toLowerCase())
    );
    const groups: Array<{ group: string; items: MultiSelectOption[] }> = [];
    for (const opt of filtered) {
      const key = opt.group ?? "";
      let g = groups.find((x) => x.group === key);
      if (!g) {
        g = { group: key, items: [] };
        groups.push(g);
      }
      g.items.push(opt);
    }
    return groups;
  }, [options, search]);

  function toggle(value: string) {
    setValues((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  }

  const selectedLabels = values
    .map((v) => options.find((o) => o.value === v)?.label ?? v)
    .join(", ");

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <label style={{ display: "block", marginBottom: 6, fontSize: "11px", fontWeight: 700, textTransform: "uppercase", color: "#64748b", letterSpacing: "0.5px" }}>
        {label}
      </label>
      {values.map((v) => (
        <input key={v} type="hidden" name={name} value={v} />
      ))}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          width: "100%",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #e2e8f0",
          fontSize: "14px",
          backgroundColor: "#fff",
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "8px",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: values.length > 0 ? "#0f172a" : "#94a3b8",
          }}
        >
          {values.length > 0 ? `${selectedLabels} (${values.length})` : placeholder}
        </span>
        <span style={{ color: "#94a3b8", fontSize: "10px", flexShrink: 0 }} aria-hidden="true">▾</span>
      </button>
      {values.length > 0 && (
        <button
          type="button"
          onClick={() => setValues([])}
          style={{
            marginTop: 4,
            fontSize: "11px",
            color: "#2563eb",
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
          }}
        >
          Clear
        </button>
      )}
      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 50,
            marginTop: 4,
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: "8px",
            boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
            maxHeight: "280px",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={`Search ${label.toLowerCase()}`}
            style={{
              border: "none",
              borderBottom: "1px solid #e2e8f0",
              padding: "10px",
              fontSize: "13px",
              outline: "none",
              flexShrink: 0,
            }}
          />
          <div style={{ overflowY: "auto", padding: "6px 0" }}>
            {grouped.length === 0 ? (
              <p style={{ padding: "10px 12px", fontSize: "12px", color: "#94a3b8" }}>{emptyMessage}</p>
            ) : (
              grouped.map((g) => (
                <div key={g.group || "__root__"}>
                  {g.group !== "" && (
                    <p style={{ padding: "6px 12px 2px", fontSize: "10px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.5px", color: "#94a3b8" }}>
                      {g.group}
                    </p>
                  )}
                  {g.items.map((opt) => {
                    const checked = values.includes(opt.value);
                    return (
                      <label
                        key={opt.value}
                        role="option"
                        aria-selected={checked}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          padding: "7px 12px",
                          fontSize: "13px",
                          cursor: "pointer",
                          color: checked ? "#1d4ed8" : "#0f172a",
                          fontWeight: checked ? 700 : 400,
                          backgroundColor: checked ? "#eff6ff" : "transparent",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggle(opt.value)}
                          style={{ accentColor: "#2563eb" }}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
