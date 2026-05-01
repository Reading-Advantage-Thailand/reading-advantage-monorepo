import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { localeConfig } from "./configs/locale-config";
import { createI18nMiddleware } from "next-international/middleware";

// Define Roles locally to avoid importing @prisma/client in Edge Middleware
const ROLES = {
  USER: "USER",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
};

const I18nMiddleware = createI18nMiddleware({
  locales: localeConfig.locales,
  defaultLocale: localeConfig.defaultLocale,
  // urlMappingStrategy: "rewrite",
});

const publicPages = [
  "/",
  "/about",
  "/contact",
  "/authors",
  "/privacy-policy",
  "/terms",
  "/auth/signin",
  "/auth/signup",
  "/auth/forgot-password",
];

// Utility: Determine if the route is a public page
function isPublicPage(normalizedPath: string): boolean {
  return publicPages.includes(normalizedPath !== "" ? normalizedPath : "/");
}

async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const isAuth = !!token;
  const authLocales = localeConfig.locales;

  const pathname = req.nextUrl.pathname;

  // Skip the middleware for API and static
  if (
    pathname.startsWith("/api") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // file extensions
  ) {
    return NextResponse.next();
  }

  // Debug Logging
  // console.log(`[Middleware] Processing: ${pathname}`);

  // Normalization Logic using Array Split (Safer/Clearer)
  const segments = pathname.split("/");
  // segments[0] is always '' because path starts with /
  // segments[1] might be locale
  const potentialLocale = segments[1];
  let urlLocale = null;
  let normalizedPath = pathname;
  let currentLocale = localeConfig.defaultLocale;

  if (potentialLocale && authLocales.includes(potentialLocale)) {
    urlLocale = potentialLocale;
    currentLocale = urlLocale;
    // Remove the locale segment
    // ['', 'en', 'student', 'read'] -> ['', 'student', 'read'] -> '/student/read'
    const newSegments = ["", ...segments.slice(2)];
    normalizedPath = newSegments.join("/") || "/";
    // If path was just "/en", segments is ['', 'en'], slice(2) is [], join is "", result "/"
    if (normalizedPath === "") normalizedPath = "/";
  }

  // console.log(`[Middleware] Normalized: ${normalizedPath} | Locale: ${currentLocale} | Role: ${token?.role}`);

  // Handle specific auth API mocks
  if (normalizedPath.startsWith("/session")) {
    return NextResponse.redirect(new URL(`/api/auth/session`, req.url));
  }
  if (normalizedPath.startsWith("/csrf")) {
    return NextResponse.redirect(new URL(`/api/auth/csrf`, req.url));
  }
  if (normalizedPath.startsWith("/signout")) {
    return NextResponse.redirect(new URL(`/api/auth/signout`, req.url));
  }

  // AUTHENTICATION LOGIC
  if (isAuth) {
    const userRole = token.role as string; // Treat as string

    // Guard: Prevent redirection loops if we are already on a transition page
    if (normalizedPath.startsWith("/role-selection")) {
      if (userRole === ROLES.USER) {
        return I18nMiddleware(req);
      }
      // If valid role visiting role-selection, let them proceed (or redirect? let's stick to safe fallback)
      return I18nMiddleware(req);
    }

    // Step 1: Role Selection (for new users)
    if (userRole === ROLES.USER) {
      if (!normalizedPath.startsWith("/role-selection")) {
        // console.log(`[Middleware] Redirecting USER to role-selection`);
        return NextResponse.redirect(
          new URL(`/${currentLocale}/role-selection`, req.url),
        );
      }
      // CRITICAL FIX: If we are here, we are on /role-selection.
      // We MUST return here. If we fall through, the 'Level Test' check below will fail (Level 0)
      // and redirect to /level. But on /level, the check 'userRole === USER' above will redirect back to /role-selection.
      // This causes the infinite loop.
      return I18nMiddleware(req);
    }

    // Step 2: Level Test
    // Applies if level/xp info is missing
    const needsLevelTest =
      token.level === undefined ||
      token.level === null ||
      token.level === 0 ||
      token.xp === 0 ||
      token.xp === null ||
      token.xp === undefined;

    if (needsLevelTest) {
      // If they need level test, they must be at /level
      // Unless they are visiting a public page? (Usually logic forces level test first)
      if (!normalizedPath.startsWith("/level")) {
        // console.log(`[Middleware] Redirecting to Level Test`);
        return NextResponse.redirect(
          new URL(`/${currentLocale}/level`, req.url),
        );
      }
      return I18nMiddleware(req);
    }

    // If at /level but don't need it? Allow for now.
    if (normalizedPath.startsWith("/level")) {
      return I18nMiddleware(req);
    }

    // Step 3: Role-based Dashboard Redirection
    let targetPath = "";

    // Explicitly check current path containment to avoid loop
    if (userRole === ROLES.TEACHER) {
      if (
        !normalizedPath.startsWith("/teacher") &&
        !normalizedPath.startsWith("/student") &&
        !normalizedPath.startsWith("/settings")
      ) {
        targetPath = "/teacher/my-classes";
      }
    } else if (userRole === ROLES.ADMIN) {
      if (
        !normalizedPath.startsWith("/teacher") &&
        !normalizedPath.startsWith("/student") &&
        !normalizedPath.startsWith("/admin") &&
        !normalizedPath.startsWith("/settings")
      ) {
        targetPath = "/admin/dashboard";
      }
    } else if (userRole === ROLES.SYSTEM) {
      if (
        normalizedPath === "/" ||
        normalizedPath.startsWith("/auth") ||
        normalizedPath === ""
      ) {
        targetPath = "/system/dashboard";
      }
    } else if (userRole === ROLES.STUDENT) {
      if (
        !normalizedPath.startsWith("/student") &&
        !normalizedPath.startsWith("/settings")
      ) {
        targetPath = "/student/read";
      }
    }

    if (targetPath) {
      // console.log(`[Middleware] Redirecting ${userRole} from ${normalizedPath} to ${targetPath}`);
      return NextResponse.redirect(
        new URL(`/${currentLocale}${targetPath}`, req.url),
      );
    }
  }

  // NON-AUTHENTICATED LOGIC
  if (!isAuth) {
    if (!isPublicPage(normalizedPath)) {
      if (!normalizedPath.startsWith("/auth")) {
        return NextResponse.redirect(
          new URL(`/${currentLocale}/auth/signin`, req.url),
        );
      }
    }
  }

  return I18nMiddleware(req);
}

export default withAuth(middleware, {
  callbacks: {
    authorized: async () => true,
  },
});

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
