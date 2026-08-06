import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "How Ireland Housing Explorer works: collecting PPR data, geocoding addresses, adding Eircodes, merging CSO statistics, and building interactive maps.",
  alternates: { canonical: "/about" },
};

const steps = [
  {
    title: "1. Collect raw data",
    kid: "We visit the Property Price Register website and download their big list of every house and apartment sold in Ireland since 2014.",
    detail: "The Property Price Register (PPR) publishes every sale filed for stamp duty. We download the full CSV (PPR-ALL.zip) via our automated pipeline."
  },
  {
    title: "2. Clean it up",
    kid: "The addresses are often in ALL CAPS or have messy abbreviations like 'Lr' instead of 'Lower'. We fix those so addresses look neat and are easier to search.",
    detail: "We run each row through toProperCase normalization, expand abbreviations (Rd→Road, Sq→Square, Ave→Avenue, Lr/Lwr→Lower, etc.), and fix awkward capitalisation like 'Miller'S Glen'."
  },
  {
    title: "3. Find it on a map",
    kid: "We search for each address using a map of Ireland on our own computer (like Google Maps but free and offline). If we find the exact spot, we save the coordinates.",
    detail: "A local Nominatim instance (Docker, Ireland OSM data) geocodes each address. When exact coordinates are unavailable, we fall back to estimated coordinates derived from routing key centroids."
  },
  {
    title: "4. Add Eircodes",
    kid: "Many records don't have an Eircode (postcode). We try to guess the right one by looking at nearby properties with known postcodes.",
    detail: "For rows missing an eircode, we attempt spatial matching against existing eircode data. If that fails, we estimate one based on routing key boundaries for coarse area-level filtering."
  },
  {
    title: "5. Merge official stats",
    kid: "We also get numbers from the Central Statistics Office — things like the official house price index and crime rates — so you can compare what's happening across different counties.",
    detail: "CSO RPPI (monthly index, base 2015=100) and CSO crime statistics (offences per 1,000 population) are ingested from published CSO datasets."
  },
  {
    title: "6. Put it on a map",
    kid: "Finally, we put everything on a nice-looking website with a map, charts, and filters so you can explore the data yourself.",
    detail: "Next.js 15 frontend with OpenLayers map (4 view modes: Points, Heatmap, Clusters, Areas), Recharts for price index charts, and full-text search across 700,000+ transactions."
  }
];

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        About this site
      </h1>
      <p className="mt-4 text-lg leading-relaxed text-slate-600">
        Ireland Housing Explorer takes public property sale records and turns them into
        an interactive map and charts. Here&apos;s what happens behind the scenes.
      </p>

      <div className="mt-16 space-y-16">
        {steps.map((step) => (
          <section key={step.title} className="relative">
            <div className="space-y-3">
              <h2 className="text-xl font-bold text-slate-900">
                {step.title}
              </h2>
              <p className="text-base leading-relaxed text-slate-700 sm:text-lg">
                {step.kid}
              </p>
              <details className="group">
                <summary className="cursor-pointer text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors">
                  How it actually works
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-slate-500">
                  {step.detail}
                </p>
              </details>
            </div>
          </section>
        ))}
      </div>

      <div className="mt-16 border-t border-slate-200 pt-10 space-y-6">
        <h2 className="text-xl font-bold text-slate-900">Data sources</h2>
        <ul className="space-y-3 text-sm leading-relaxed text-slate-600">
          <li>
            <strong className="text-slate-900">Property Price Register (PPR):</strong>{" "}
            All residential property sales filed for stamp duty in Ireland since 2014.
            Published by the Property Services Regulatory Authority.
          </li>
          <li>
            <strong className="text-slate-900">CSO Residential Property Price Index (RPPI):</strong>{" "}
            Official monthly index of Irish residential property prices (base 2015=100).
          </li>
          <li>
            <strong className="text-slate-900">CSO Crime Statistics:</strong>{" "}
            Quarterly crime offence rates per 1,000 population, published by An Garda Síochána.
          </li>
          <li>
            <strong className="text-slate-900">OpenStreetMap (Nominatim):</strong>{" "}
            Geographic data used for address geocoding.
          </li>
        </ul>

        <p className="text-sm text-slate-500">
          Total records: <strong>700,000+</strong> property sales spanning{" "}
          <strong>2014–present</strong>.{" "}
          <Link href="/" className="text-blue-600 hover:underline">
            Start exploring
          </Link>
          .
        </p>
      </div>
    </main>
  );
}
