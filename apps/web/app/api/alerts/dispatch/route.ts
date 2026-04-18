import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
import { sendAlertEmail } from "@/lib/mailer";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userEmail = session.user.email.toLowerCase();
  const userRole = (session.user as { role?: string }).role?.toString().toLowerCase();
  const adminEmails = new Set(
    (process.env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean)
  );

  const isAdmin = adminEmails.has(userEmail) || userRole === "admin";

  if (!isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const alerts = await prisma.alert.findMany({
    where: { enabled: true },
    include: { user: true, savedSearch: true },
    take: 100
  });

  let sent = 0;
  const failed: Array<{ alertId: string; reason: string }> = [];

  for (const alert of alerts) {
    try {
      await sendAlertEmail({
        to: alert.user.email,
        subject: "Ireland Housing Explorer Alert",
        text: `Alert ${alert.type} triggered for search "${alert.savedSearch?.name ?? "N/A"}".`
      });

      await prisma.alert.update({
        where: { id: alert.id },
        data: { lastTriggeredAt: new Date() }
      });

      sent += 1;
    } catch (error) {
      console.error(`Failed to dispatch alert ${alert.id}:`, error);
      failed.push({
        alertId: alert.id,
        reason: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  return NextResponse.json({ sent, failed });
}
