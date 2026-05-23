import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";

const intlMiddleware = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  const response = intlMiddleware(request);

  // Fix Cloud Run port leakage in locale redirects
  if (response.status === 307 || response.status === 308) {
    const location = response.headers.get("location");
    if (location) {
      const cleanLocation = location.replace(/:8080(?!\d)/, "");
      if (cleanLocation !== location) {
        return NextResponse.redirect(cleanLocation, response.status);
      }
    }
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|static|.*\\..*|_next|favicon.ico|robots.txt).*)"],
};
