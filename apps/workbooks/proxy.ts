import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const WORKBOOKS_SESSION_COOKIE = "__Host-ra_workbooks_session";

function getPublicUrl(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone();
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");

  url.protocol = forwardedProto ? `${forwardedProto}:` : url.protocol;
  url.host = forwardedHost ?? url.host;
  if (forwardedHost && !forwardedHost.includes(":")) {
    url.port = "";
  }
  url.pathname = pathname;
  url.search = "";

  return url;
}

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (
    pathname.startsWith("/api/auth/") ||
    pathname.startsWith("/_next") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const sessionToken = request.cookies.get(WORKBOOKS_SESSION_COOKIE)?.value;

  if (!sessionToken) {
    const loginUrl = getPublicUrl(request, "/api/auth/company/start");
    loginUrl.searchParams.set("returnTo", pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // The proxy performs only a routing hint from cookie presence. Exact
  // WORKBOOK_ADMIN authorization is enforced by the revocation-aware backend.

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
