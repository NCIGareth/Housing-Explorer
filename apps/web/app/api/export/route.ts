import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const { prisma } = await import("@/lib/db");

  const url = new URL(req.url);
  const county = url.searchParams.get("county");
  const minPrice = url.searchParams.get("minPriceEur");
  const maxPrice = url.searchParams.get("maxPriceEur");
  const startDate = url.searchParams.get("startDate");
  const endDate = url.searchParams.get("endDate");

  const where: Record<string, unknown> = {};
  if (county) where.county = county;
  if (minPrice) where.priceEur = { ...(where.priceEur as object || {}), gte: parseInt(minPrice) };
  if (maxPrice) where.priceEur = { ...(where.priceEur as object || {}), lte: parseInt(maxPrice) };
  if (startDate || endDate) {
    where.saleDate = {};
    if (startDate) (where.saleDate as Record<string, unknown>).gte = new Date(startDate);
    if (endDate) (where.saleDate as Record<string, unknown>).lte = new Date(endDate);
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
    const addr = `"${s.address.replace(/"/g, '""')}"`;
    const desc = `"${(s.descriptionOfProperty || "").replace(/"/g, '""')}"`;
    return `${addr},${s.county},${s.eircode || ""},${s.priceEur},${date},${desc}`;
  });

  const csv = [header, ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="property-sales-${county || "all"}-${new Date().toISOString().split("T")[0]}.csv"`,
    },
  });
}
