import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 bg-slate-50/50 pt-16 pb-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2 decoration-transparent">
              <span className="text-xl font-bold tracking-tight text-slate-900">
                Housing<span className="text-blue-600">Explorer</span>
              </span>
            </Link>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              The premier evidence-driven real estate tool for Ireland. Combining 15 years of transaction history with live market inventory.
            </p>
          </div>
          
          <div>
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Data Sources</h3>
            <ul className="mt-6 space-y-4 text-sm text-slate-500">
              <li>PSRA Transaction Log (PPR)</li>
              <li>CSO Residential Price Index</li>
              <li>Ireland Nominatim (Geo)</li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <h3 className="text-xs font-bold uppercase tracking-widest text-slate-900">Official PPR Information</h3>
            <div className="mt-6 space-y-4 text-xs leading-relaxed text-slate-500">
              <p>
                <strong className="text-slate-700">LPT Disclaimer:</strong> The PSRA has no role in the calculation or collection of the Local Property Tax (LPT). For information, visit the <a href="https://www.revenue.ie/en/property/local-property-tax/index.aspx" target="_blank" className="text-blue-600 hover:underline">Revenue Commissioners</a>.
              </p>
              <p>
                <strong className="text-slate-700">Data Limitations:</strong> Records include Date of Sale, Price, and Address only. No particulars (floor area, number of rooms, etc.) are recorded by the register.
              </p>
              <p>
                <strong className="text-slate-700">Multi-Unit Sales:</strong> Where multiple apartments are sold for a single price, the record depends on the filer (e.g., a single €2m record for 15 units).
              </p>
              <p>
                <strong className="text-slate-700">Errors:</strong> Data is filed electronically for stamp duty purposes. If you notice an error in a record you own, request your solicitor to file an amended stamp duty return.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mt-16 border-t border-slate-200 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              © {new Date().getFullYear()} Ireland Housing Explorer
            </p>
            <p className="text-[10px] text-slate-400">
              Information provided is based on public records. Not an official "Property Price Index".
            </p>
          </div>
          <div className="flex items-center gap-6">
            <Link href="https://www.propertypriceregister.ie" target="_blank" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase">
              Official Register
            </Link>
            <div className="h-4 w-px bg-slate-200"></div>
            <Link href="mailto:info@psr.ie" className="text-[10px] font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase">
              Contact PSRA
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
