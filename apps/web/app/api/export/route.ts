import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { buildPprFilterWhere } from "@/lib/queries";
import type { PprFilterParams } from "@/lib/queries";

export const maxDuration = 60;

function sanitizeCsvCell(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`;
  }
  return value;
}

export async function GET(req: Request) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      || req.headers.get("x-real-ip")
      || "127.0.0.1";

    const { allowed } = await checkRateLimit(`export:${ip}`, 10, 60000);
    if (!allowed) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

    const { prisma } = await import("@/lib/db");

    const url = new URL(req.url);
    const county = url.searchParams.get("county") ?? "Dublin";

    const minPriceRaw = url.searchParams.get("minPriceEur");
    const maxPriceRaw = url.searchParams.get("maxPriceEur");
    const startDateRaw = url.searchParams.get("startDate");
    const endDateRaw = url.searchParams.get("endDate");

    const params: PprFilterParams = { county };
    if (minPriceRaw !== null && minPriceRaw !== "") params.minPriceEur = parseInt(minPriceRaw, 10);
    if (maxPriceRaw !== null && maxPriceRaw !== "") params.maxPriceEur = parseInt(maxPriceRaw, 10);
    if (startDateRaw) params.startDate = new Date(startDateRaw);
    if (endDateRaw) params.endDate = new Date(endDateRaw);

    const eircode = url.searchParams.get("eircode");
    const locality = url.searchParams.get("locality");
    const propertyType = url.searchParams.get("propertyType");
    const notFullMarketPrice = url.searchParams.get("notFullMarketPrice") === "on";
    const vatExclusive = url.searchParams.get("vatExclusive") === "on";

    if (eircode) params.eircode = eircode;
    if (locality) params.locality = locality;
    if (propertyType) params.propertyDescription = propertyType;
    if (notFullMarketPrice) params.notFullMarketPrice = true;
    if (vatExclusive) params.vatExclusive = true;

    const where = buildPprFilterWhere(params);

    const sales = await prisma.propertySale.findMany({
      where,
      orderBy: { saleDate: "desc" },
      take: 10000,
      select: {
        address: true, county: true, eircode: true, priceEur: true,
        saleDate: true, descriptionOfProperty: true,
      }
    });

    const header = "Address,County,Eircode,Price (EUR),Sale Date,Description";
    const rows = sales.map(s => {
      const date = s.saleDate.toISOString().split("T")[0];
      const addr = `"${sanitizeCsvCell(s.address).replace(/"/g, '""')}"`;
      const desc = `"${sanitizeCsvCell(s.descriptionOfProperty || "").replace(/"/g, '""')}"`;
      return `${addr},${s.county},${s.eircode || ""},${s.priceEur},${date},${desc}`;
    });

    const csv = [header, ...rows].join("\n");

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="property-sales-${county || "all"}-${new Date().toISOString().split("T")[0]}.csv"`,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
