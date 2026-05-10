import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/supabase/auth-utils";

const createSchema = z.object({
  name: z.string().min(1),
  county: z.string().optional(),
  minPriceEur: z.number().int().optional(),
  maxPriceEur: z.number().int().optional(),
  minBeds: z.number().int().optional(),
});

export async function GET() {
  const { prisma } = await import("@/lib/db");
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.savedSearch.findMany({
    where: { user: { email: user.email } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { alerts: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { prisma } = await import("@/lib/db");
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = createSchema.parse(await req.json());

  const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
  if (!dbUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const item = await prisma.savedSearch.create({
    data: { userId: dbUser.id, ...body },
  });
  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { prisma } = await import("@/lib/db");
  const user = await getAuthUser();
  if (!user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const search = await prisma.savedSearch.findFirst({
    where: { id, user: { email: user.email } },
  });
  if (!search) {
    return NextResponse.json({ error: "Saved search not found" }, { status: 404 });
  }

  await prisma.savedSearch.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
