import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type EircodeRow = {
  key: string;
  county: string;
  locality: string;
  volume: number;
};

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");

    const rows = await prisma.$queryRaw`
      SELECT "key", county, locality, volume
      FROM (
        SELECT
          SUBSTRING(COALESCE(eircode, "estimatedEircode"), 1, 3) AS "key",
          county,
          SPLIT_PART(address, ',', GREATEST(array_length(string_to_array(address, ','), 1) - 1, 1)) AS locality,
          COUNT(*)::int AS volume
        FROM "PropertySale"
        WHERE COALESCE(eircode, "estimatedEircode") IS NOT NULL
        GROUP BY 1, 2, 3
      ) t
      ORDER BY volume DESC
    `;

    const seen = new Set<string>();
    const items: EircodeRow[] = [];
    for (const row of rows as EircodeRow[]) {
      if (!row.key || seen.has(row.key)) continue;
      seen.add(row.key);
      items.push(row);
      if (items.length >= 500) break;
    }

    return NextResponse.json(
      { items },
      { headers: { "Cache-Control": "public, max-age=86400, stale-while-revalidate=86400" } }
    );
  } catch (error) {
    console.error("Failed to fetch eircodes:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
