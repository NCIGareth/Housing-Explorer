import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/supabase/auth-utils";
import { checkRateLimit } from "@/lib/rate-limit";

const createSchema = z.object({
  savedSearchId: z.string().optional(),
  type: z.enum(["NEW_LISTING_MATCH", "PRICE_DROP"]),
});

export async function GET() {
  try {
    const { prisma } = await import("@/lib/db");
    const user = await getAuthUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const items = await prisma.alert.findMany({
      where: { user: { email: user.email } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch alerts:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const user = await getAuthUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(`alert:${user.email}`, 10);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const body = createSchema.parse(await req.json());

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const alert = await prisma.alert.create({
      data: { userId: dbUser.id, ...body, enabled: true },
    });
    return NextResponse.json({ alert }, { status: 201 });
  } catch (error) {
    console.error("Failed to create alert:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const { sendAlertEmail } = await import("@/lib/mailer");
    const user = await getAuthUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(`alert:${user.email}`, 10);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const payload = z
      .object({ alertId: z.string(), previewMessage: z.string().min(1) })
      .parse(await req.json());

    const alert = await prisma.alert.findFirst({
      where: { id: payload.alertId, user: { email: user.email } },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found or access denied" }, { status: 404 });
    }

    await sendAlertEmail({
      to: user.email,
      subject: "Ireland Housing Explorer Alert Preview",
      text: payload.previewMessage,
    });

    const updated = await prisma.alert.update({
      where: { id: payload.alertId },
      data: { lastTriggeredAt: new Date() },
    });

    return NextResponse.json({ updated });
  } catch (error) {
    console.error("Failed to preview alert:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { prisma } = await import("@/lib/db");
    const user = await getAuthUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { allowed } = await checkRateLimit(`alert:${user.email}`, 10);
    if (!allowed) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const alert = await prisma.alert.findFirst({
      where: { id, user: { email: user.email } },
    });
    if (!alert) {
      return NextResponse.json({ error: "Alert not found" }, { status: 404 });
    }

    await prisma.alert.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete alert:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
