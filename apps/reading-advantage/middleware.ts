import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

// Define Roles locally to avoid importing @prisma/client in Edge Middleware
const ROLES = {
  USER: "USER",
  STUDENT: "STUDENT",
  TEACHER: "TEACHER",
  ADMIN: "ADMIN",
  SYSTEM: "SYSTEM",
};

const I18nMiddleware = createMiddleware(routing);

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
  const authLocales = routing.locales;

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

  // Normalization Logic using Array Split (Safer/Clearer)
  const segments = pathname.split("/");
  // segments[0] is always '' because path starts with /
  // segments[1] might be locale
  const potentialLocale = segments[1];
  let urlLocale = null;
  let normalizedPath = pathname;
  let currentLocale = routing.defaultLocale;

  if (potentialLocale && authLocales.includes(potentialLocale)) {
    urlLocale = potentialLocale;
    currentLocale = urlLocale;
    // Remove the locale segment
    const newSegments = ["", ...segments.slice(2)];
    normalizedPath = newSegments.join("/") || "/";
    if (normalizedPath === "") normalizedPath = "/";
  }

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
    const userRole = token.role as string;

    // Guard: Prevent redirection loops if we are already on a transition page
    if (normalizedPath.startsWith("/role-selection")) {
      if (userRole === ROLES.USER) {
        return I18nMiddleware(req);
      }
      return I18nMiddleware(req);
    }

    // Step 1: Role Selection (for new users)
    if (userRole === ROLES.USER) {
      if (!normalizedPath.startsWith("/role-selection")) {
        return NextResponse.redirect(
          new URL(`/${currentLocale}/role-selection`, req.url),
        );
      }
      return I18nMiddleware(req);
    }

    // Step 2: Level Test
    const needsLevelTest =
      token.level === undefined ||
      token.level === null ||
      token.level === 0 ||
      token.xp === 0 ||
      token.xp === null ||
      token.xp === undefined;

    if (needsLevelTest) {
      if (!normalizedPath.startsWith("/level")) {
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
