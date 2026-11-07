import { NextResponse, type NextRequest } from "next/server";
import { localeSchema, logout } from "../../../../lib/auth";
import { SESSION_COOKIE_NAME, clearSessionCookie } from "../../../../lib/auth/cookie";
import { CrossOriginError, assertSameOrigin } from "../../../../lib/auth/same-origin";

/**
 * The sign-out handler of the Storytime app (design section 2, AC-4.3).
 *
 * The handler checks the origin first, so a request from another site gets 403, sets no cookie,
 * and changes no session. It then ends the session of the device and clears the cookie. A device
 * without a session answers 303 as well, so the sign-out never fails.
 */

/**
 * Answers one sign-out.
 * @param request The request of the form.
 * @returns The redirect to the sign-in page.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertSameOrigin(request.headers, request.nextUrl.origin);
  } catch (error) {
    if (error instanceof CrossOriginError) {
      // A request from another site changes no session, so it writes no audit row. The log line
      // names the reason and holds no password and no token.
      console.warn("storytime sign-out rejected: reason=cross_origin");
      return new Response(null, { status: 403 });
    }
    throw error;
  }

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value ?? "";
  await logout(token);
  const form = await request.formData().catch(() => null);
  const localeValue = form?.get("locale");
  const locale = localeSchema.parse(typeof localeValue === "string" ? localeValue : "");
  const response = NextResponse.redirect(new URL(`/${locale}/sign-in`, request.nextUrl), 303);
  response.headers.set("Set-Cookie", clearSessionCookie());
  return response;
}

/**
 * Answers a sign-out that arrives with a GET request.
 * @returns The answer that names the one method the route takes.
 */
export async function GET(): Promise<Response> {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}
