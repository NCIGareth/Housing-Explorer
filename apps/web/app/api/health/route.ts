import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    
    await prisma.$queryRaw`SELECT 1 as db_check`;

    return NextResponse.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
    }, { status: 503 });
  }
}
