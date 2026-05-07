import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).max(128).optional(),
});

export async function PATCH(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");
  const bcrypt = await import("bcryptjs");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { name, currentPassword, newPassword } = parsed.data;

  if (newPassword && !currentPassword) {
    return NextResponse.json(
      { error: "Current password is required to set a new password" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (newPassword) {
    const isValid = await bcrypt.compare(currentPassword!, user.password);
    if (!isValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }
  }

  const data: Record<string, string> = {};
  if (name) data.name = name;
  if (newPassword) data.password = await bcrypt.hash(newPassword, 12);

  await prisma.user.update({
    where: { email: session.user.email },
    data,
  });

  return NextResponse.json({ success: true });
}
