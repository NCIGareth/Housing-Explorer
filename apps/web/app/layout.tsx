import "./globals.css";
import type { Metadata, Viewport } from "next";
import { ErrorBoundary } from "@/components/error-boundary";

export const metadata: Metadata = {
  title: "Ireland Housing Explorer",
  description: "Cross-reference 15 years of PPR sales with live market inventory.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // maximumScale: 1 is great for utility apps, but ensures 
  // users can't zoom into the map on touch devices. 
  // Keep it for now since this is a data-entry/explorer style tool.
  maximumScale: 1,
};

import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Suspense } from "react";
import RecentSaleStatus from "@/components/RecentSaleStatus";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased bg-[#fefefe] text-slate-900" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <Header />
          <div className="bg-slate-50 border-b border-slate-100 py-1.5 px-4 text-[10px] font-black uppercase tracking-widest text-slate-500">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <Suspense fallback={<span>Loading latest data...</span>}>
                <RecentSaleStatus />
              </Suspense>
              <span className="hidden md:inline">Open Market Intelligence Protocol v1.0</span>
            </div>
          </div>

          {/* Error Boundary should wrap the main content area 
              to keep the Nav and Footer interactive if a chart crashes */}
          <main className="flex-1">
            <ErrorBoundary>
              {children}
            </ErrorBoundary>
          </main>

          <Footer />
        </div>
      </body>
    </html>
  );
}
