import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Middleware for codecamp-advantage.
 *
 * Protects /admin/* routes by validating the session cookie exists
 * and redirecting unauthenticated users. Admin role enforcement is
 * handled by adminProcedure at the tRPC layer, which provides the
 * true security boundary. This middleware provides defense-in-depth
 * by ensuring unauthenticated users never reach admin page components.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protect admin routes — require authentication
  if (pathname.startsWith("/admin")) {
    const sessionToken = request.cookies.get("session_token")?.value;

    if (!sessionToken) {
      // No session cookie — redirect to home with return path
      const homeUrl = new URL("/", request.url);
      homeUrl.searchParams.set("redirectTo", pathname);
      return NextResponse.redirect(homeUrl);
    }

    // Session token present — let the request proceed.
    // The tRPC adminProcedure enforces role-based access at the API level,
    // and the admin page components check user.role client-side.
    // This provides two layers of protection:
    //   1. Middleware: redirects unauthenticated users (no session cookie)
    //   2. adminProcedure: returns FORBIDDEN for non-ADMIN users at tRPC level
    //   3. Client components: hide admin UI for non-ADMIN users
    return NextResponse.next();
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};