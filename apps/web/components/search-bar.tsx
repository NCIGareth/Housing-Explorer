"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type SearchSuggestion = {
  id: string;
  address: string;
  county: string;
  eircode: string | null;
  priceEur: number;
  saleDate: string;
};

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      setIsOpen(false);
      setSelectedIndex(-1);
      return;
    }

    setLoading(true);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data);
        setIsOpen(data.length > 0);
        setSelectedIndex(-1);
      } catch {
        setSuggestions([]);
        setIsOpen(false);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(debounceRef.current);
  }, [query]);

  const navigate = (suggestion: SearchSuggestion) => {
    setIsOpen(false);
    setQuery("");
    inputRef.current?.blur();
    if (suggestion.eircode) {
      router.push(`/?eircode=${encodeURIComponent(suggestion.eircode)}`);
    } else {
      router.push(`/sales/${suggestion.id}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsOpen(false);
    inputRef.current?.blur();
    if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
      navigate(suggestions[selectedIndex]);
      return;
    }
    if (query.trim()) {
      router.push(`/?eircode=${encodeURIComponent(query.trim())}`);
      setQuery("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Escape") {
      setIsOpen(false);
      setSelectedIndex(-1);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        listRef.current &&
        !listRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const highlightMatch = (text: string, q: string) => {
    if (!q || q.length < 2) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="bg-yellow-200 rounded px-0.5">{text.slice(idx, idx + q.length)}</mark>
        {text.slice(idx + q.length)}
      </>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => { if (suggestions.length > 0) setIsOpen(true); }}
        placeholder="Search address, eircode..."
        className="w-64 pl-9 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white/80 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder:text-slate-400"
      />
      <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>

      {isOpen && (
        <div
          ref={listRef}
          className="absolute top-full mt-1 left-0 right-0 bg-white rounded-lg shadow-xl border border-slate-200 max-h-80 overflow-y-auto z-50"
        >
          {loading && (
            <div className="px-3 py-2 text-xs text-slate-400 flex items-center gap-2">
              <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              Searching...
            </div>
          )}
          {suggestions.map((s, i) => (
            <button
              key={s.id}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); navigate(s); }}
              className={`w-full text-left px-3 py-2.5 text-sm border-b border-slate-100 last:border-0 transition-colors ${
                i === selectedIndex ? "bg-blue-50" : "hover:bg-slate-50"
              }`}
            >
              <span className="block truncate font-medium text-slate-700">
                {highlightMatch(s.address, query)}
              </span>
              <span className="block text-xs text-slate-400 mt-0.5">
                {s.county}{s.eircode ? ` · ${s.eircode}` : ""} · €{s.priceEur.toLocaleString("en-IE")}
              </span>
            </button>
          ))}
        </div>
      )}
    </form>
  );
}
