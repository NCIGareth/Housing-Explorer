import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { checkRateLimit } from "@/lib/rate-limit";

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

    const { allowed } = checkRateLimit(`export:${ip}`, 10, 60000);
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
    const county = url.searchParams.get("county");
    const minPrice = url.searchParams.get("minPriceEur");
    const maxPrice = url.searchParams.get("maxPriceEur");
    const startDate = url.searchParams.get("startDate");
    const endDate = url.searchParams.get("endDate");

    const where: Prisma.PropertySaleWhereInput = {};
    if (county) where.county = county;
    if (minPrice || maxPrice) {
      where.priceEur = {};
      if (minPrice) where.priceEur.gte = parseInt(minPrice);
      if (maxPrice) where.priceEur.lte = parseInt(maxPrice);
    }
    if (startDate || endDate) {
      where.saleDate = {};
      if (startDate) where.saleDate.gte = new Date(startDate);
      if (endDate) where.saleDate.lte = new Date(endDate);
    }

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
      },
    });
  } catch (error) {
    console.error("Export failed:", error);
    return NextResponse.json({ error: "Failed to export data" }, { status: 500 });
  }
}
