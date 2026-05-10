import { NextResponse } from "next/server";

export async function POST() {
  const { createClient } = await import("@/lib/supabase/server");
  const { prisma } = await import("@/lib/db");
  const { sendAlertEmail } = await import("@/lib/mailer");

  const cronSecret = process.env.DISPATCH_CRON_SECRET;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").map(s => s.trim()).filter(Boolean);
  const isAuthorized = user?.email && adminEmails.includes(user.email);

  const { headers: reqHeaders } = await import("next/headers");
  const h = await reqHeaders();
  const cronHeader = h.get("x-cron-secret");
  const isCron = cronSecret && cronHeader === cronSecret;

  if (!isAuthorized && !isCron) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({
    where: { enabled: true, savedSearchId: { not: null } },
    include: { user: true, savedSearch: true },
  });

  let sent = 0;
  const failed: Array<{ alertId: string; reason: string }> = [];

  for (const alert of alerts) {
    if (!alert.user.email || !alert.savedSearch) continue;

    const since = alert.lastTriggeredAt ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const criteria = alert.savedSearch;

    let listings: Array<{ title: string; locality: string | null; askingPriceEur: number; beds: number | null; listingUrl: string; previousPriceEur: number | null }> = [];

    if (alert.type === "NEW_LISTING_MATCH") {
      listings = await prisma.listingCurrent.findMany({
        where: {
          AND: [
            { createdAt: { gt: since } },
            ...(criteria.county ? [{ county: criteria.county }] : []),
            ...(criteria.minPriceEur != null ? [{ askingPriceEur: { gte: criteria.minPriceEur } }] : []),
            ...(criteria.maxPriceEur != null ? [{ askingPriceEur: { lte: criteria.maxPriceEur } }] : []),
            ...(criteria.minBeds != null ? [{ beds: { gte: criteria.minBeds } }] : []),
          ],
        },
        select: { title: true, locality: true, askingPriceEur: true, beds: true, listingUrl: true, previousPriceEur: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      });
    }

    if (alert.type === "PRICE_DROP") {
      const candidates = await prisma.listingCurrent.findMany({
        where: {
          AND: [
            { previousPriceEur: { not: null } },
            { priceUpdatedAt: { gt: since } },
            ...(criteria.county ? [{ county: criteria.county }] : []),
            ...(criteria.minPriceEur != null ? [{ askingPriceEur: { gte: criteria.minPriceEur } }] : []),
            ...(criteria.maxPriceEur != null ? [{ askingPriceEur: { lte: criteria.maxPriceEur } }] : []),
            ...(criteria.minBeds != null ? [{ beds: { gte: criteria.minBeds } }] : []),
          ],
        },
        select: { title: true, locality: true, askingPriceEur: true, beds: true, listingUrl: true, previousPriceEur: true },
        orderBy: { priceUpdatedAt: "desc" },
        take: 50,
      });

      listings = candidates.filter(l => l.previousPriceEur != null && l.previousPriceEur > l.askingPriceEur).slice(0, 20);
    }

    if (listings.length === 0) continue;

    const lines = listings.map(l => {
      const location = l.locality ? ` in ${l.locality}` : "";
      const beds = l.beds != null ? `, ${l.beds} bed` : "";
      const drop = l.previousPriceEur ? ` (was €${l.previousPriceEur.toLocaleString()})` : "";
      return `- €${l.askingPriceEur.toLocaleString()}${drop} — ${l.title}${beds}${location}\n  ${l.listingUrl}`;
    });

    const subject = alert.type === "NEW_LISTING_MATCH"
      ? `New listings: ${criteria.name}`
      : `Price drops: ${criteria.name}`;

    const text = [
      `Hello,`,
      ``,
      `${listings.length} matching ${alert.type === "NEW_LISTING_MATCH" ? "listing" : "price drop"}${listings.length > 1 ? "s" : ""} found for "${criteria.name}":`,
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
    } catch (err) {
      failed.push({ alertId: alert.id, reason: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ sent, failed: failed.length > 0 ? failed : undefined });
}
