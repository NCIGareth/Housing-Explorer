import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // Check database connectivity
    await prisma.$queryRaw`SELECT 1 as db_check`;

    // Get recent ingestion runs
    const recentRuns = await prisma.ingestionRun.findMany({
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
    });

    // Get basic stats
    const [listingCount, historicalCount, userCount] = await Promise.all([
      prisma.listingCurrent.count({ where: { isActive: true } }),
      prisma.historicalMetric.count(),
      prisma.user.count()
    ]);

    const lastSuccessfulRun = recentRuns.find(run => run.status === 'SUCCESS');
    const lastFailedRun = recentRuns.find(run => run.status === 'FAILED');

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      database: {
        status: "connected",
        activeListings: listingCount,
        historicalRecords: historicalCount,
        users: userCount
      },
      ingestion: {
        lastSuccessfulRun: lastSuccessfulRun ? {
          source: lastSuccessfulRun.source,
          finishedAt: lastSuccessfulRun.finishedAt,
          rowsProcessed: lastSuccessfulRun.rowsUpserted
        } : null,
        lastFailedRun: lastFailedRun ? {
          source: lastFailedRun.source,
          finishedAt: lastFailedRun.finishedAt,
          error: lastFailedRun.error
        } : null,
        recentRuns: recentRuns.map(run => ({
          source: run.source,
          status: run.status,
          startedAt: run.startedAt,
          duration: run.finishedAt ? (new Date(run.finishedAt).getTime() - new Date(run.startedAt).getTime()) / 1000 : null
        }))
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
