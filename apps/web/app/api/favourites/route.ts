import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const items = await prisma.favouriteProperty.findMany({
    where: { user: { email: session.user.email } },
    orderBy: { createdAt: "desc" },
    include: {
      property: {
        select: {
          id: true, address: true, county: true, priceEur: true,
          saleDate: true, eircode: true, descriptionOfProperty: true,
        }
      }
    }
  });

  return NextResponse.json({ items });
}

export async function POST(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId } = await req.json();
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const existing = await prisma.favouriteProperty.findUnique({
    where: { userId_propertyId: { userId: user.id, propertyId } }
  });
  if (existing) {
    return NextResponse.json({ item: existing });
  }

  const item = await prisma.favouriteProperty.create({
    data: { userId: user.id, propertyId }
  });

  return NextResponse.json({ item }, { status: 201 });
}

export async function DELETE(req: Request) {
  const { getServerSession } = await import("next-auth");
  const { authOptions } = await import("@/lib/auth");
  const { prisma } = await import("@/lib/db");

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { propertyId } = await req.json();
  if (!propertyId) {
    return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  await prisma.favouriteProperty.deleteMany({
    where: { userId: user.id, propertyId }
  });

  return NextResponse.json({ success: true });
}
