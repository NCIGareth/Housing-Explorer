import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_PATHS = ["/api/alerts", "/api/favourites", "/api/saved-searches"];

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  if (PROTECTED_PATHS.some((path) => request.nextUrl.pathname.startsWith(path))) {
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/api/alerts/:path*", "/api/favourites/:path*", "/api/saved-searches/:path*"],
};
