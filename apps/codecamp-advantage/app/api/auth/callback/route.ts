import { NextResponse } from "next/server";

import { isLegacyCodecampAuthEnabled } from "@/lib/auth-mode";
import {
  CODECAMP_SESSION_COOKIE,
  CODECAMP_TRANSACTION_COOKIE,
  codecampSessionRole,
  getCodecampOidcClient,
  readCodecampCookie,
} from "@/lib/company-oidc";
import { getPublicOrigin } from "@/lib/public-url";

/** Expires a host-only cookie with its original attributes. */
function expireHostCookie(
  response: NextResponse,
  name: string,
  secure: boolean,
): void {
  response.cookies.set(name, "", {
    expires: new Date(0),
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure,
  });
}

/** Exchanges one exact Accounts callback for a Codecamp-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  const secureCookie =
    process.env.NODE_ENV === "production" || publicOrigin.protocol === "https:";
  if (isLegacyCodecampAuthEnabled()) {
    const response = NextResponse.redirect(
      new URL("/?error=legacy_auth_active", publicOrigin),
    );
    expireHostCookie(response, CODECAMP_TRANSACTION_COOKIE, secureCookie);
    return response;
  }
  const transaction = readCodecampCookie(request, CODECAMP_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    expireHostCookie(response, CODECAMP_TRANSACTION_COOKIE, secureCookie);
    return response;
  }
  const client = getCodecampOidcClient();
  try {
    const session = await client.exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    try {
      codecampSessionRole(session.identity);
    } catch {
      try {
        await client.logout(session.accessToken);
      } catch {
        // The callback never issues a local session after a failed revocation.
      }
      const response = NextResponse.redirect(
        new URL("/?error=forbidden", publicOrigin),
      );
      expireHostCookie(response, CODECAMP_SESSION_COOKIE, secureCookie);
      expireHostCookie(response, CODECAMP_TRANSACTION_COOKIE, secureCookie);
      return response;
    }
    const response = NextResponse.redirect(new URL(session.returnTo, publicOrigin));
    response.cookies.set(CODECAMP_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    expireHostCookie(response, CODECAMP_TRANSACTION_COOKIE, secureCookie);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    expireHostCookie(response, CODECAMP_TRANSACTION_COOKIE, secureCookie);
    return response;
  }
}
