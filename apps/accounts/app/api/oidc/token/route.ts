import { NextResponse } from "next/server";

import { CompanyIdentityError } from "@reading-advantage/backend";

import { getIdentityComposition } from "@/lib/server/identity";

/** Exchanges one authorization code for an opaque app session and signed ID token. */
export async function POST(request: Request): Promise<NextResponse> {
  try {
    const form = await request.formData();
    const basic = request.headers.get("authorization");
    let basicClientId: string | undefined;
    let basicSecret: string | undefined;
    if (basic?.startsWith("Basic ")) {
      const decoded = Buffer.from(basic.slice(6), "base64").toString("utf8");
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        basicClientId = decoded.slice(0, separator);
        basicSecret = decoded.slice(separator + 1);
      }
    }
    const result = await (await getIdentityComposition()).service.exchangeCode({
      grantType: form.get("grant_type"),
      code: form.get("code"),
      clientId: basicClientId ?? form.get("client_id"),
      clientSecret: basicSecret ?? form.get("client_secret") ?? undefined,
      redirectUri: form.get("redirect_uri"),
      codeVerifier: form.get("code_verifier"),
    });
    return NextResponse.json({
      access_token: result.accessToken,
      token_type: result.tokenType,
      expires_in: result.expiresIn,
      id_token: result.idToken,
    }, { headers: { "Cache-Control": "no-store", Pragma: "no-cache" } });
  } catch (error) {
    if (error instanceof CompanyIdentityError && error.code === "CLIENT_INVALID") {
      return NextResponse.json(
        { error: "invalid_client" },
        {
          status: 401,
          headers: {
            "Cache-Control": "no-store",
            "WWW-Authenticate": 'Basic realm="accounts-token"',
          },
        },
      );
    }
    const invalidGrant =
      error instanceof CompanyIdentityError &&
      (error.code === "AUTHORIZATION_CODE_INVALID" ||
        error.code === "SESSION_INVALID");
    return NextResponse.json(
      { error: invalidGrant ? "invalid_grant" : "invalid_request" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }
}
