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

/** Exchanges one exact Accounts callback for a Codecamp-local opaque session. */
export async function GET(request: Request): Promise<NextResponse> {
  const url = new URL(request.url);
  const publicOrigin = getPublicOrigin(request);
  if (isLegacyCodecampAuthEnabled()) {
    const response = NextResponse.redirect(
      new URL("/?error=legacy_auth_active", publicOrigin),
    );
    response.cookies.delete(CODECAMP_TRANSACTION_COOKIE);
    return response;
  }
  const transaction = readCodecampCookie(request, CODECAMP_TRANSACTION_COOKIE);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  if (!transaction || !code || !state) {
    return NextResponse.redirect(new URL("/?error=sso", publicOrigin));
  }
  try {
    const session = await getCodecampOidcClient().exchange({
      code,
      state,
      sealedTransaction: transaction,
    });
    try {
      codecampSessionRole(session.identity);
    } catch {
      const response = NextResponse.redirect(
        new URL("/?error=forbidden", publicOrigin),
      );
      response.cookies.delete(CODECAMP_TRANSACTION_COOKIE);
      return response;
    }
    const response = NextResponse.redirect(new URL(session.returnTo, publicOrigin));
    response.cookies.set(CODECAMP_SESSION_COOKIE, session.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" || publicOrigin.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: Math.max(1, Math.floor(
        (new Date(session.expiresAt).getTime() - Date.now()) / 1000,
      )),
    });
    response.cookies.delete(CODECAMP_TRANSACTION_COOKIE);
    return response;
  } catch {
    const response = NextResponse.redirect(new URL("/?error=sso", publicOrigin));
    response.cookies.delete(CODECAMP_TRANSACTION_COOKIE);
    return response;
  }
}
