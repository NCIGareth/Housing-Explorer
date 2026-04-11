import Link from 'next/link';

export default function Header({ latestSaleDate }: { latestSaleDate?: Date }) {
  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl transition-all duration-300">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group decoration-transparent">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg transition-transform group-hover:scale-105">
              <span className="text-xl font-black">H</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Housing<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Explorer</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              Explorer
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {latestSaleDate && (
            <div className="hidden items-center gap-2 rounded-full border border-blue-100 bg-blue-50/50 px-3 py-1 lg:flex shadow-sm">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-500"></span>
              </span>
              <span className="text-[10px] font-bold text-slate-500">
                Latest Record: <span className="text-blue-700 uppercase">{latestSaleDate.toLocaleDateString('en-IE', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
              </span>
            </div>
          )}
          
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>
          
          <div className="flex items-center text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            v2.1.0-stable
          </div>
        </div>
      </div>
    </nav>
  );
}
