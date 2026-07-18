import { NextResponse } from "next/server";

import { getIdentityComposition } from "@/lib/server/identity";

/** Publishes the Accounts OpenID Provider discovery document. */
export async function GET(): Promise<NextResponse> {
  const { issuerUrl } = await getIdentityComposition();
  return NextResponse.json({
    issuer: issuerUrl,
    authorization_endpoint: `${issuerUrl}/api/oidc/authorize`,
    token_endpoint: `${issuerUrl}/api/oidc/token`,
    introspection_endpoint: `${issuerUrl}/api/oidc/introspect`,
    end_session_endpoint: `${issuerUrl}/api/oidc/logout`,
    jwks_uri: `${issuerUrl}/api/oidc/jwks`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile"],
    code_challenge_methods_supported: ["S256"],
    token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
  });
}
