import { updateSession } from "@/lib/supabase/middleware";
import { NextResponse, type NextRequest } from "next/server";

const PROTECTED_API_PATHS = ["/api/alerts", "/api/favourites", "/api/saved-searches"];
const PROTECTED_PAGE_PATHS = ["/account/alerts", "/account/favourites", "/account/profile"];
const DISPATCH_PATH = "/api/alerts/dispatch";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Dispatch is authorized by x-vercel-cron header, not session
  if (pathname.startsWith(DISPATCH_PATH)) {
    return NextResponse.next({ request });
  }

  const { supabaseResponse, user } = await updateSession(request);

  const isProtectedApi = PROTECTED_API_PATHS.some((p) => pathname.startsWith(p));
  const isProtectedPage = PROTECTED_PAGE_PATHS.some((p) => pathname.startsWith(p));

  if (isProtectedApi && !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (isProtectedPage && !user) {
    return NextResponse.redirect(new URL("/auth/signin", request.url));
  }

  const response = supabaseResponse;
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

  return response;
}

export const config = {
  matcher: ["/api/:path*", "/account/:path*"],
};
