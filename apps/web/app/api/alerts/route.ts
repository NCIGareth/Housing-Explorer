import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  savedSearchId: z.string().optional(),
  type: z.enum(["NEW_LISTING_MATCH", "PRICE_DROP"])
});

export async function GET() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const alerts = await prisma.alert.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  return NextResponse.json({ alerts });
}

export async function POST(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = createSchema.parse(await req.json());

  // Get user from session
  const user = await prisma.user.findUnique({
    where: { email: session.user.email }
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const alert = await prisma.alert.create({
    data: {
      userId: user.id,
      ...body,
      enabled: true
    }
  });
  return NextResponse.json({ alert }, { status: 201 });
}

export async function PATCH(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const { sendAlertEmail } = await import("@/lib/mailer");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const payload = z
    .object({
      alertId: z.string(),
      previewMessage: z.string().min(1)
    })
    .parse(await req.json());

  // Verify the alert belongs to the current user
  const alert = await prisma.alert.findFirst({
    where: {
      id: payload.alertId,
      user: { email: session.user.email }
    }
  });
  if (!alert) {
    return NextResponse.json({ error: "Alert not found or access denied" }, { status: 404 });
  }

  await sendAlertEmail({
    to: session.user.email,
    subject: "Ireland Housing Explorer Alert Preview",
    text: payload.previewMessage
  });

  const updated = await prisma.alert.update({
    where: { id: payload.alertId },
    data: { lastTriggeredAt: new Date() }
  });

  return NextResponse.json({ updated });
}
