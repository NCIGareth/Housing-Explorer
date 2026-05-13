import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");

    await prisma.$queryRaw`SELECT 1 as db_check`;

    const dbInfo = await prisma.$queryRaw<Array<{
      tableName: string;
      rowCount: bigint;
      totalBytes: bigint;
    }>>`
      SELECT
        relname AS "tableName",
        n_live_tup AS "rowCount",
        pg_total_relation_size(relid) AS "totalBytes"
      FROM pg_stat_user_tables
      ORDER BY pg_total_relation_size(relid) DESC
      LIMIT 10
    `;

    const totalBytes = dbInfo.reduce((sum, t) => sum + Number(t.totalBytes), 0);
    const totalMb = Math.round(totalBytes / (1024 * 1024));
    const pctUsed = Math.round((totalMb / 500) * 100);

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: {
        sizeMb: totalMb,
        capacityMb: 500,
        pctUsed,
        tables: dbInfo.map((t) => ({
          name: t.tableName,
          rows: Number(t.rowCount),
          sizeMb: Math.round(Number(t.totalBytes) / (1024 * 1024)),
        })),
      },
    });
  } catch {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
