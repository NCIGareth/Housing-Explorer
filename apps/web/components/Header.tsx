"use client";

import Link from 'next/link';
import { SearchBar } from './search-bar';
import { useState } from 'react';
import { useSession, signOut } from 'next-auth/react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { data: session } = useSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl transition-all duration-300" aria-label="Main navigation">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group decoration-transparent" aria-label="Home">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 text-white shadow-lg transition-transform group-hover:scale-105">
              <span className="text-xl font-black" aria-hidden="true">H</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Housing<span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">Explorer</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            <Link href="/" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              Explorer
            </Link>
            <Link href="/compare" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
              Compare
            </Link>
            {session?.user && (
              <>
                <Link href="/account/alerts" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  Alerts
                </Link>
                <Link href="/account/favourites" className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
                  Saved
                </Link>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:block">
            <SearchBar />
          </div>

          <div className="hidden md:flex items-center gap-3">
            {session?.user ? (
              <>
                <Link href="/account/profile" className="text-xs text-slate-500 truncate max-w-[120px] hover:text-slate-700 transition-colors" aria-label={`Account: ${session.user.email}`}>
                  {session.user.email}
                </Link>
                <button
                  onClick={() => signOut()}
                  className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  aria-label="Sign out"
                >
                  Sign out
                </button>
              </>
            ) : (
              <Link
                href="/auth/signin"
                className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition-colors"
              >
                Sign in
              </Link>
            )}
          </div>

          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex md:hidden h-10 w-10 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden="true">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white/95 backdrop-blur-xl px-4 py-4 space-y-4 shadow-lg" role="menu">
          <div className="flex flex-wrap items-center gap-4">
            <Link href="/" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors" role="menuitem">
              Explorer
            </Link>
            <Link href="/compare" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors" role="menuitem">
              Compare
            </Link>
            {session?.user && (
              <>
                <Link href="/account/alerts" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors" role="menuitem">
                  Alerts
                </Link>
                <Link href="/account/favourites" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors" role="menuitem">
                  Saved
                </Link>
                <Link href="/account/profile" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-slate-700 hover:text-blue-600 transition-colors" role="menuitem">
                  Profile
                </Link>
              </>
            )}
            {session?.user ? (
              <button onClick={() => { setMenuOpen(false); signOut(); }} className="text-sm font-medium text-rose-600 hover:text-rose-700 transition-colors" role="menuitem">
                Sign out
              </button>
            ) : (
              <Link href="/auth/signin" onClick={() => setMenuOpen(false)} className="text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors" role="menuitem">
                Sign in
              </Link>
            )}
          </div>
          <div className="relative">
            <SearchBar />
          </div>
          {session?.user && (
            <div className="text-xs text-slate-400">
              {session.user.email}
            </div>
          )}
          <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest">
            v2.1.0-stable
          </div>
        </div>
      )}
    </nav>
  );
}
