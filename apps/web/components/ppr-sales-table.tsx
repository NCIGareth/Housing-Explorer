"use client";

import Link from "next/link";
import { ActiveFilterChips } from "./active-filter-chips";

type SaleRow = {
  id: string;
  address: string;
  county: string;
  eircode?: string | null;
  estimatedEircode?: string | null;
  priceEur: number;
  saleDate: Date;
  descriptionOfProperty: string;
  notFullMarketPrice: boolean;
  vatExclusive: boolean;
};

const PAGE_SIZES = [20, 50, 100];

export function PprSalesTable({
  sales,
  currentPage = 1,
  pageSize = 20,
  hasNextPage = false,
  totalCount,
  searchParams = {}
}: {
  sales: SaleRow[];
  currentPage?: number;
  pageSize?: number;
  hasNextPage?: boolean;
  totalCount?: number;
  searchParams?: Record<string, string | string[] | undefined>;
}) {
  const hasPreviousPage = currentPage > 1;

  function toParam(v: string | string[] | undefined): string | undefined {
    if (v === undefined || v === "") return undefined;
    return Array.isArray(v) ? v[0] : v;
  }

  function buildHref(overrides: Record<string, string | undefined>) {
    const entries = Object.entries({ ...searchParams, ...overrides })
      .map(([k, v]) => [k, toParam(v)] as const)
      .filter(([, v]) => v !== undefined && v !== "");
    const qs = entries.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`).join("&");
    return `/?${qs}`;
  }

  return (
    <section className="bg-white rounded-xl overflow-hidden flex flex-col">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Property Price Register
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Page {currentPage} &middot; {sales.length} of {totalCount && totalCount > 0 ? totalCount.toLocaleString() : sales.length} records
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
            Show
            <select
              value={pageSize}
              onChange={(e) => {
                const el = e.target as HTMLSelectElement;
                window.location.href = buildHref({ pageSize: el.value, page: "1" });
              }}
              className="text-[11px] font-bold text-slate-700 bg-white border border-slate-200 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              {PAGE_SIZES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
          <span className="hidden sm:inline-flex text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100 text-[11px] font-bold">** Non-Market</span>
          <span className="hidden sm:inline-flex text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100 text-[11px] font-bold">Ex-VAT</span>
        </div>
      </div>

      <ActiveFilterChips searchParams={searchParams} />

      <div className="overflow-auto max-h-[600px] relative">
        <table className="w-full border-collapse min-width-[700px]">
          <thead className="sticky top-0 z-10 bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Address</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Eircode</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest text-right">Price</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Date</th>
              <th className="px-4 py-3 text-left text-[11px] font-bold text-slate-500 uppercase tracking-widest">Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {sales.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                  No records matching current filters.
                </td>
              </tr>
            ) : (
              sales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-4 py-3">
                    <Link href={`/sales/${s.id}`} className="block font-bold text-slate-900 hover:text-blue-600 transition-colors">
                      {s.address}
                    </Link>
                    <span className="text-[11px] text-slate-400 uppercase">{s.county}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {s.eircode ? (
                      s.eircode
                    ) : s.estimatedEircode ? (
                      <span className="border-b border-dashed border-slate-300 cursor-help" title="Estimated based on locality">
                        {s.estimatedEircode}*
                      </span>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-slate-900">
                        €{s.priceEur.toLocaleString()}
                        {s.notFullMarketPrice && <span className="ml-1 text-amber-500" title="Not Full Market Price">**</span>}
                      </span>
                      {s.vatExclusive && (
                        <span className="text-[11px] font-bold text-blue-500 uppercase leading-none">Ex-VAT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {(typeof s.saleDate === 'string' ? new Date(s.saleDate) : s.saleDate).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[11px] font-bold uppercase tracking-tight">
                      {s.descriptionOfProperty.replace("Dwelling house /Apartment", "Resi")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center mt-auto">
        <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
          Page {currentPage}
        </div>
        <div className="flex gap-2">
          {hasPreviousPage ? (
            <Link
              href={buildHref({ page: String(currentPage - 1) })}
              className="px-4 py-2 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-widest"
            >
              Previous
            </Link>
          ) : (
            <span className="px-4 py-2 text-[11px] font-bold text-slate-300 bg-slate-50 border border-slate-100 rounded-lg uppercase tracking-widest cursor-not-allowed">
              Previous
            </span>
          )}

          {hasNextPage ? (
            <Link
              href={buildHref({ page: String(currentPage + 1) })}
              className="px-4 py-2 text-[11px] font-bold text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm uppercase tracking-widest"
            >
              Next
            </Link>
          ) : (
            <span className="px-4 py-2 text-[11px] font-bold text-slate-300 bg-slate-50 border border-slate-100 rounded-lg uppercase tracking-widest cursor-not-allowed">
              Next
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
