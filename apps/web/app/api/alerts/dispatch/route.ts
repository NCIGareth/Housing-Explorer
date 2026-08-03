import { NextResponse } from "next/server";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const { createClient } = await import("@/lib/supabase/server");
    const { prisma } = await import("@/lib/db");
    const { sendAlertEmail } = await import("@/lib/mailer");

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
    const isAuthorized = user?.email && adminEmails.includes(user.email);

    const { headers: reqHeaders } = await import("next/headers");
    const h = await reqHeaders();
    const isCron = h.get("x-vercel-cron") === "1" || h.get("x-cron-secret") === process.env.DISPATCH_CRON_SECRET;

    if (!isAuthorized && !isCron) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const alerts = await prisma.alert.findMany({
      where: { enabled: true, savedSearchId: { not: null } },
      include: { user: true, savedSearch: true },
    });

    console.log(`Alert dispatch started: ${alerts.length} enabled alerts`);

    let sent = 0;
    const failed: Array<{ alertId: string; reason: string }> = [];
    const skipped: string[] = [];

    for (const alert of alerts) {
      if (!alert.user.email || !alert.savedSearch) continue;

      const since = alert.lastTriggeredAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const criteria = alert.savedSearch;

      const sales = await prisma.propertySale.findMany({
        where: {
          AND: [
            { createdAt: { gt: since } },
            ...(criteria.county ? [{ county: criteria.county }] : []),
            ...(criteria.minPriceEur != null ? [{ priceEur: { gte: criteria.minPriceEur } }] : []),
            ...(criteria.maxPriceEur != null ? [{ priceEur: { lte: criteria.maxPriceEur } }] : []),
          ],
        },
        select: { address: true, county: true, priceEur: true, saleDate: true, descriptionOfProperty: true, propertySizeDescription: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });

      if (sales.length === 0) {
        skipped.push(alert.id);
        continue;
      }

      console.log(`Alert ${alert.id} (${alert.user.email}): ${sales.length} matching sale(s) since ${since.toISOString()}`);

      const lines = sales.map(s => {
        const size = s.propertySizeDescription ? ` (${s.propertySizeDescription})` : "";
        return `- €${s.priceEur.toLocaleString()} — ${s.address}, ${s.county}${size}\n  ${s.descriptionOfProperty}, sold ${s.saleDate.toLocaleDateString()}`;
      });

      const subject = `New property sales: ${criteria.name}`;

      const text = [
        `Hello,`,
        ``,
        `${sales.length} new sale${sales.length > 1 ? "s" : ""} matching "${criteria.name}" since ${since.toLocaleDateString()}:`,
        ``,
        ...lines,
        ``,
        `Log in to manage your alerts: https://${process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL || "irelandhousingexplorer.com"}/account/alerts`,
        ``,
        `— Ireland Housing Explorer`,
      ].join("\n");

      try {
        await sendAlertEmail({ to: alert.user.email, subject, text });
        await prisma.alert.update({
          where: { id: alert.id },
          data: { lastTriggeredAt: new Date() },
        });
        sent++;
        console.log(`Alert ${alert.id}: email sent`);
      } catch (err) {
        const reason = err instanceof Error ? err.message : String(err);
        failed.push({ alertId: alert.id, reason });
        console.error(`Alert ${alert.id}: email send failed`, err);
      }
    }

    console.log(`Alert dispatch complete: sent=${sent}, failed=${failed.length}, skipped=${skipped.length}`);

    return NextResponse.json({
      sent,
      failed: failed.length > 0 ? failed : undefined,
      skipped: skipped.length > 0 ? skipped : undefined,
    });
  } catch (error) {
    console.error("Alert dispatch failed:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
