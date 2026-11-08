import type { NextRequest } from "next/server";
import { login, localeSchema, signInFieldsSchema } from "../../../../lib/auth";
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
 * Answers one sign-in.
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
  if (!fields.success) {
    return seeOther(`/${locale}/sign-in?error=invalid&next=${encodeURIComponent(next)}`);
  }

  const outcome = await login({
    username: fields.data.username,
    password: fields.data.password,
    ip: clientIp(request.headers),
    now,
  });
  if (outcome.status === "signed_in") {
    const response = seeOther(next);
    response.headers.set("Set-Cookie", outcome.cookie);
    return response;
  }
  const error = outcome.status === "locked" ? "locked" : "invalid";
  return seeOther(`/${locale}/sign-in?error=${error}&next=${encodeURIComponent(next)}`);
}
