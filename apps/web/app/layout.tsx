import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/error-boundary";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Ireland Housing Explorer",
  description: "Cross-reference 13 years of Property Price Register sales with live market inventory.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import AuthProvider from "@/components/auth-provider";
import { Suspense } from "react";
import RecentSaleStatus from "@/components/RecentSaleStatus";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#fefefe] text-slate-900" suppressHydrationWarning>
        <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-blue-600 focus:text-white focus:rounded-lg focus:text-sm focus:font-semibold focus:outline-none">
          Skip to main content
        </a>
        <AuthProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="bg-slate-50 border-b border-slate-100 py-1.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Suspense fallback={<span>Loading latest data...</span>}>
                <RecentSaleStatus />
              </Suspense>
              <span className="hidden md:inline text-slate-400">Data from Property Price Register &amp; CSO</span>
            </div>
          </div>

          {/* Error Boundary should wrap the main content area 
              to keep the Nav and Footer interactive if a chart crashes */}
          <main id="main-content" className="flex-1">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>

          <Footer />
        </div>
        </AuthProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
