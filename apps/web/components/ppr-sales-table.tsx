import Link from "next/link";

type SaleRow = {
  id: string;
  address: string;
  county: string;
  eircode?: string | null;
  priceEur: number;
  saleDate: Date;
  descriptionOfProperty: string;
  notFullMarketPrice: boolean;
  vatExclusive: boolean;
};

// ... thStyle and tdStyle remain the same ...

export function PprSalesTable({ sales }: { sales: SaleRow[] }) {
  return (
    <section className="bg-white rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">
            Registry Transaction Log
          </h3>
          <p className="text-[10px] text-slate-500 mt-0.5">
            Official records from the Property Services Regulatory Authority (PSRA).
          </p>
        </div>
        <div className="flex gap-2 text-[10px] font-bold">
          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">** Non-Market</span>
          <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">Ex-VAT</span>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-width-[700px]">
          <thead>
            <tr className="bg-slate-50/30 border-b border-slate-100">
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Address</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Eircode</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Price</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Date</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-400 uppercase tracking-widest">Notes</th>
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
                    <span className="text-[10px] text-slate-400 uppercase">{s.county}</span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-500">
                    {s.eircode || "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-col items-end">
                      <span className="font-black text-slate-900">
                        €{s.priceEur.toLocaleString()}
                        {s.notFullMarketPrice && <span className="ml-1 text-amber-500" title="Not Full Market Price">**</span>}
                      </span>
                      {s.vatExclusive && (
                        <span className="text-[9px] font-bold text-blue-500 uppercase leading-none">Ex-VAT</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(s.saleDate).toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-tight">
                      {s.descriptionOfProperty.replace("Dwelling house /Apartment", "Resi")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
