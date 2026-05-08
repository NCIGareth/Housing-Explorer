import { NextResponse } from "next/server";

interface IngestionRun {
  id: string;
  source: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  rowsRead: number;
  rowsUpserted: number;
  error: string | null;
}

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1 as db_check`;

    // Get recent ingestion runs
    const recentRuns = (await prisma.ingestionRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 5,
      select: {
        id: true,
        source: true,
        status: true,
        startedAt: true,
        finishedAt: true,
        rowsRead: true,
        rowsUpserted: true,
        error: true
      }
    })) as IngestionRun[];

    const [listingCount] = await Promise.all([
      prisma.listingCurrent.count({ where: { isActive: true } }),
    ]);

    const lastSuccessfulRun = recentRuns.find((run) => run.status === 'SUCCESS');
    const lastFailedRun = recentRuns.find((run) => run.status === 'FAILED');

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "connected",
        activeListings: listingCount,
      },
      ingestion: {
        lastSuccessfulRun: lastSuccessfulRun ? {
          source: lastSuccessfulRun.source,
          finishedAt: lastSuccessfulRun.finishedAt,
          rowsProcessed: lastSuccessfulRun.rowsUpserted
        } : null,
        lastFailedRun: lastFailedRun ? {
          source: lastFailedRun.source,
          error: lastFailedRun.error
        } : null,
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 503 });
  }
}
