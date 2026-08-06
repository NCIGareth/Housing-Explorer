import { NextResponse } from "next/server";
import { getCapacityMb } from "@/lib/db-capacity";

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    const { sendAlertEmail } = await import("@/lib/mailer");

    const dbInfo = await prisma.$queryRaw<Array<{
      totalBytes: bigint;
    }>>`
      SELECT SUM(pg_total_relation_size(relid)) AS "totalBytes"
      FROM pg_stat_user_tables
    `;

    const totalMb = Math.round(Number(dbInfo[0]?.totalBytes ?? 0) / (1024 * 1024));
    const capacityMb = getCapacityMb();
    const pctUsed = Math.round((totalMb / capacityMb) * 100);

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim()).filter(Boolean);

    if (pctUsed >= 85 && adminEmails.length > 0) {
      await sendAlertEmail({
        to: adminEmails[0],
        subject: `⚠️ DB at ${pctUsed}% — Ireland Housing Explorer`,
        text: [
          `Database is at ${totalMb} MB / ${capacityMb} MB (${pctUsed}%).`,
          ``,
          `Action: on Supabase, prune the retention window (oldest years) or raise the plan; on self-hosted, enlarge the disk volume or set DB_CAPACITY_MB to match it.`,
          `Health: ${process.env.VERCEL_PROJECT_PRODUCTION_URL || "localhost"}/api/health`,
        ].join("\n"),
      });
    }

    return NextResponse.json({
      sizeMb: totalMb,
      capacityMb,
      pctUsed,
      alertSent: pctUsed >= 85 && adminEmails.length > 0,
    });
  } catch (error) {
    console.error("Monitor check failed:", error);
    return NextResponse.json({ error: "Monitor check failed" }, { status: 500 });
  }
}
