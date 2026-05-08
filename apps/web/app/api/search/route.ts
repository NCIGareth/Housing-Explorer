import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/lib/queries";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  try {
    const results = await searchProperties(q.trim(), 20);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
