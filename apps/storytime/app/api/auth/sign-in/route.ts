import type { NextRequest, NextResponse } from "next/server";
import {
  SIGN_IN_USERNAME_COOKIE,
  login,
  localeSchema,
  signInFieldsSchema,
} from "../../../../lib/auth";
import { clearSignInUsernameCookie, createSignInUsernameCookie } from "../../../../lib/auth/cookie";
import { clientIp } from "../../../../lib/auth/client-ip";
import { safeReturnPath } from "../../../../lib/auth/return-path";
import {
  CrossOriginError,
  assertSameOrigin,
  ownOriginOf,
  seeOther,
} from "../../../../lib/auth/same-origin";

/**
 * The sign-in handler of the Storytime app (design section 2, AC-4.3).
 *
 * The handler checks the origin first, so a request from another site gets 403, sets no cookie,
 * and changes no session. It then reads the form fields, holds the rate limit of the account and
 * of the client address, verifies the Argon2id hash, and creates the session. A good answer
 * redirects to the checked `next`; a bad answer redirects to the sign-in page with one message.
 * Every redirect has a relative Location, because `request.nextUrl` holds the bind address of the
 * standalone image (finding F60).
 */

/**
 * Reads one form field as text.
 * @param value The raw form value.
 * @returns The text of the field, or an empty string.
 */
function text(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

/**
 * Builds the path of the sign-in page with one error and the checked return path.
 * @param locale The locale of the sign-in page.
 * @param error The error code that the page shows.
 * @param next The checked return path.
 * @returns The path and query of the sign-in page.
 */
function signInPath(locale: string, error: "invalid" | "locked", next: string): string {
  return `/${locale}/sign-in?error=${error}&next=${encodeURIComponent(next)}`;
}

/**
 * Answers one sign-in.
 *
 * The handler builds all redirects before it calls `login`. When a redirect cannot be built, the
 * handler writes no session and no audit row, and answers a 303 to `/<locale>/st`.
 * @param request The request of the form.
 * @returns The redirect to the checked path, or the answer of a rejected request.
 */
export async function POST(request: NextRequest): Promise<Response> {
  try {
    assertSameOrigin(request.headers, ownOriginOf(request.headers, request.nextUrl.origin));
  } catch (error) {
    if (error instanceof CrossOriginError) {
      // A request from another site changes no session, so it writes no audit row. The log line
      // names the reason and holds no password and no token.
      console.warn("storytime sign-in rejected: reason=cross_origin");
      return new Response(null, { status: 403 });
    }
    throw error;
  }

  const form = await request.formData();
  const locale = localeSchema.parse(text(form.get("locale")));
  const next = safeReturnPath(text(form.get("next")), `/${locale}/st`);
  const fields = signInFieldsSchema.safeParse({
    username: text(form.get("username")),
    password: text(form.get("password")),
  });
  const now = new Date();

  // Every redirect is built before `login` runs, because `login` writes the session and the audit
  // row. A Location that cannot be built then leaves no session and no audit row (finding F90).
  // The answer to that failure uses no `seeOther`, so it cannot fail the same way.
  let redirects: { signedIn: NextResponse; invalid: NextResponse; locked: NextResponse };
  try {
    redirects = {
      signedIn: seeOther(next),
      invalid: seeOther(signInPath(locale, "invalid", next)),
      locked: seeOther(signInPath(locale, "locked", next)),
    };
  } catch {
    console.warn("storytime sign-in rejected: reason=bad_location");
    return new Response(null, { status: 303, headers: { Location: `/${locale}/st` } });
  }
  // A wrong sign-in carries the username back in one flash cookie (UX F1). The helper refuses a
  // username that fails the username rule, and the cookie never holds the password.
  const invalid = (): NextResponse => {
    const flash = createSignInUsernameCookie(locale, text(form.get("username")));
    if (flash) redirects.invalid.headers.append("Set-Cookie", flash);
    return redirects.invalid;
  };
  if (!fields.success) return invalid();

  const outcome = await login({
    username: fields.data.username,
    password: fields.data.password,
    ip: clientIp(request.headers),
    now,
  });
  if (outcome.status === "signed_in") {
    redirects.signedIn.headers.set("Set-Cookie", outcome.cookie);
    if (request.cookies.has(SIGN_IN_USERNAME_COOKIE)) {
      redirects.signedIn.headers.append("Set-Cookie", clearSignInUsernameCookie(locale));
    }
    return redirects.signedIn;
  }
  return outcome.status === "locked" ? redirects.locked : invalid();
}
