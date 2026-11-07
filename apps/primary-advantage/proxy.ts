import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { currentUser } from "./lib/session";
import { normalizeRole } from "./lib/authorization";
import { protectedRoutes, roleDefaultRedirects } from "./lib/route-policies";
import { safeCallbackPath } from "./lib/safe-callback-path";

// Create the intl middleware
const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  // Get the pathname without locale

  const pathname = request.nextUrl.pathname;
  const locale = request.nextUrl.pathname.split("/")[1];
  const pathWithoutLocale = pathname.replace(`/${locale}`, "") || "/";

  // Handle post-login redirects
  if (pathWithoutLocale === "/auth/signin") {
    const session = await currentUser();
    const token = session;

    if (token) {
      const userRole = normalizeRole(token.role).toLowerCase();
      // The callback is a local path without a locale, or null (M-8: no open redirect).
      const callbackPath = safeCallbackPath(request.nextUrl.searchParams.get("callbackUrl"));

      if (callbackPath) {
        // Check if user has access to the callback path
        const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
          callbackPath.startsWith(route),
        )?.[1];

        if (requiredRoles && requiredRoles.includes(normalizeRole(token.role))) {
          // If user has access to the callback path, redirect there on this host
          return NextResponse.redirect(
            new URL(`/${locale}${callbackPath === "/" ? "" : callbackPath}`, request.url),
          );
        }
      }

      // If no callback URL or user doesn't have access, use default redirect
      const defaultRedirect =
        roleDefaultRedirects[userRole as keyof typeof roleDefaultRedirects];
      if (defaultRedirect) {
        return NextResponse.redirect(
          new URL(`/${locale}${defaultRedirect}`, request.url),
        );
      }
      // Fallback redirect to home page
      return NextResponse.redirect(new URL(`/${locale}/`, request.url));
    }
  }

  // A signed-in user on the bare locale root goes to the role home: the installed app starts at "/" (manual test M1).
  if (pathWithoutLocale === "/" && (routing.locales as readonly string[]).includes(locale)) {
    const user = await currentUser();
    const home = user ? roleDefaultRedirects[normalizeRole(user.role).toLowerCase()] : undefined;
    if (home) return NextResponse.redirect(new URL(`/${locale}${home}`, request.url));
  }

  //handle i18n routing
  const response = intlMiddleware(request);

  // Check if the route is protected
  const isProtectedRoute = Object.keys(protectedRoutes).some((route) =>
    pathWithoutLocale.startsWith(route),
  );

  if (isProtectedRoute) {
    const session = await currentUser();
    const token = session;

    // If no token, redirect to login
    if (!token) {
      const loginUrl = new URL(`/${locale}/auth/signin`, request.url);
      loginUrl.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Check if user has required role for the route
    const userRole = normalizeRole(token.role);
    const requiredRoles = Object.entries(protectedRoutes).find(([route]) =>
      pathWithoutLocale.startsWith(route),
    )?.[1];

    if (requiredRoles && !requiredRoles.includes(userRole)) {
      // Redirect to unauthorized page if user doesn't have required role
      return NextResponse.redirect(
        new URL(`/${locale}/unauthorized`, request.url),
      );
    }
  }

  return response;
}

export const config = {
  // Match all pathnames except for
  // - API routes
  // - Next.js internals
  // - Static files
  matcher: [
    "/((?!api|trpc|_next|_next/image|favicon.ico|_vercel|.*\\..*).*)",
    // "/((?!api|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    // Skip Next.js internals and all static files, unless found in search params
    // "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // // Always run for API routes
    // "/(api|trpc)(.*)",
  ],
};
