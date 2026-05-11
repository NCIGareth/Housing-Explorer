import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/supabase/auth-utils";

export async function GET(request: NextRequest) {
  try {
    const { prisma } = await import("@/lib/db");
    const user = await getAuthUser();
    if (!user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const propertyId = request.nextUrl.searchParams.get("propertyId");
    if (propertyId) {
      const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
      if (!dbUser) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const item = await prisma.favouriteProperty.findUnique({
        where: { userId_propertyId: { userId: dbUser.id, propertyId } },
      });
      return NextResponse.json({ saved: !!item });
    }

    const items = await prisma.favouriteProperty.findMany({
      where: { user: { email: user.email } },
      orderBy: { createdAt: "desc" },
      include: {
        property: {
          select: {
            id: true, address: true, county: true, priceEur: true,
            saleDate: true, eircode: true, descriptionOfProperty: true,
          },
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch favourites:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
        },
      },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Failed to fetch favourites:", error);
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

    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const existing = await prisma.favouriteProperty.findUnique({
      where: { userId_propertyId: { userId: dbUser.id, propertyId } },
    });
    if (existing) {
      return NextResponse.json({ item: existing });
    }

    const item = await prisma.favouriteProperty.create({
      data: { userId: dbUser.id, propertyId },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Failed to add favourite:", error);
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

    const { propertyId } = await req.json();
    if (!propertyId) {
      return NextResponse.json({ error: "propertyId is required" }, { status: 400 });
    }

    const dbUser = await prisma.user.findUnique({ where: { email: user.email } });
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    await prisma.favouriteProperty.deleteMany({
      where: { userId: dbUser.id, propertyId },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to remove favourite:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
