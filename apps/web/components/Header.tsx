import Link from 'next/link';

export default function Header() {
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
          <div className="flex items-center text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            v2.1.0-stable
          </div>
        </div>
      </div>
    </nav>
  );
}
