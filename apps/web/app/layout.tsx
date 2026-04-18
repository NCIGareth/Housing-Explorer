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
import { getLatestSaleDate } from "@/lib/queries";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Gracefully handle database being missing during build-time (Static Site Generation / SSG)
  let latestSaleDate;
  try {
    latestSaleDate = await getLatestSaleDate();
  } catch (error) {
    console.warn("Failed to fetch latest sale date during build/render:", error);
  }
  
  return (
    <html lang="en">
      <body className="antialiased bg-[#fefefe] text-slate-900" suppressHydrationWarning>
        <div className="min-h-screen flex flex-col">
          <Header latestSaleDate={latestSaleDate} />

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
