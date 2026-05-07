import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST() {
  const { createClient } = await import("@/lib/supabase/server");
  const { prisma } = await import("@/lib/db");
  const { sendAlertEmail } = await import("@/lib/mailer");

  const cronSecret = process.env.DISPATCH_CRON_SECRET;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
  const isAuthorized = user?.email && adminEmails.includes(user.email);

  // Check x-cron-secret header for cron-triggered dispatch
  const { headers: reqHeaders } = await import("next/headers");
  const h = await reqHeaders();
  const cronHeader = h.get("x-cron-secret");
  const isCron = cronSecret && cronHeader === cronSecret;

  if (!isAuthorized && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({
    where: { enabled: true },
    include: { user: true, savedSearch: true },
  });

  let sent = 0;
  const failed: Array<{ alertId: string; reason: string }> = [];

  for (const alert of alerts) {
    const to = alert.user.email;
    const searchName = alert.savedSearch?.name ?? "General";
    const subject =
      alert.type === "NEW_LISTING_MATCH"
        ? `New listing match: ${searchName}`
        : `Price drop: ${searchName}`;
    const text = `Hello,\n\nThis is an automated alert from Ireland Housing Explorer.\n\nType: ${alert.type}\nSaved search: ${searchName}\n\nLog in to view details.\n\n— Ireland Housing Explorer`;

    try {
      await sendAlertEmail({ to, subject, text });
      await prisma.alert.update({
        where: { id: alert.id },
        data: { lastTriggeredAt: new Date() },
      });
      sent++;
    } catch (err) {
      failed.push({ alertId: alert.id, reason: String(err) });
    }
  }

  return NextResponse.json({ sent, failed: failed.length > 0 ? failed : undefined });
}
