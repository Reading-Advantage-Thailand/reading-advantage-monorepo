import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";
import { identityErrorResponse } from "@/lib/server/http";

/** Validates an OIDC authorization request and issues a one-time PKCE-bound code. */
export async function GET(request: Request): Promise<NextResponse> {
  try {
    const url = new URL(request.url);
    const composition = await getIdentityComposition();
    const ssoSessionToken = (await cookies()).get(composition.cookie.name)?.value;
    if (!ssoSessionToken) {
      const signIn = new URL("/", composition.issuerUrl);
      signIn.searchParams.set("returnTo", `${url.pathname}${url.search}`);
      return NextResponse.redirect(signIn);
    }
    const result = await composition.service.authorize({
      clientId: url.searchParams.get("client_id"),
      redirectUri: url.searchParams.get("redirect_uri"),
      responseType: url.searchParams.get("response_type"),
      scope: url.searchParams.get("scope"),
      state: url.searchParams.get("state"),
      nonce: url.searchParams.get("nonce"),
      codeChallenge: url.searchParams.get("code_challenge"),
      codeChallengeMethod: url.searchParams.get("code_challenge_method"),
      ssoSessionToken,
    });
    const callback = new URL(result.redirectUri);
    callback.searchParams.set("code", result.code);
    callback.searchParams.set("state", result.state);
    return NextResponse.redirect(callback);
  } catch (error) {
    return identityErrorResponse(error);
  }
}
