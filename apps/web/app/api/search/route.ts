import { NextRequest, NextResponse } from "next/server";
import { searchProperties } from "@/lib/queries";
import { checkRateLimit } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "127.0.0.1";

  const { allowed } = checkRateLimit(`search:${ip}`, 30, 60000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests" },
      {
        status: 429,
        headers: { "Retry-After": "60" },
      }
    );
  }

  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.length < 2) {
    return NextResponse.json({ error: "Query must be at least 2 characters" }, { status: 400 });
  }

  try {
    const results = await searchProperties(q.trim(), 20);
    return NextResponse.json(results);
  } catch (error) {
    console.error("Search failed:", error);
    return NextResponse.json({ error: "Search failed" }, { status: 500 });
  }
}
