import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  if (request.nextUrl.pathname.startsWith("/api/alerts")) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/api/alerts/:path*", "/api/favourites/:path*", "/api/saved-searches/:path*"],
};
