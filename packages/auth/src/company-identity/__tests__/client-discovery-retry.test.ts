import { describe, expect, it, vi } from "vitest";

import { createCompanyOidcClient } from "../client.js";

const issuer = "https://accounts.reading-advantage.com";
const config = {
  issuerUrl: issuer,
  clientId: "sales-web",
  clientSecret: "s".repeat(32),
  redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
  expectedAudience: "sales",
  clockSkewSeconds: 30,
};
const discoveryDoc = {
  issuer,
  authorization_endpoint: `${issuer}/api/oidc/authorize`,
  token_endpoint: `${issuer}/api/oidc/token`,
  introspection_endpoint: `${issuer}/api/oidc/introspect`,
  end_session_endpoint: `${issuer}/api/oidc/logout`,
  jwks_uri: `${issuer}/api/oidc/jwks`,
  code_challenge_methods_supported: ["S256"],
};

// Defect: client.ts:184 assigns the discovery promise with `??=` and
// never clears it on rejection. One transient discovery failure stays
// cached, so every later call on the same client fails until restart.
describe("company OIDC discovery after a transient failure", () => {
  it.fails("retries discovery on the next call after a 503", async () => {
    const request = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 503 }))
      .mockImplementation(async () => Response.json(discoveryDoc));
    const client = createCompanyOidcClient({ config, fetch: request as typeof fetch });

    await expect(client.start("/")).rejects.toThrow("COMPANY_OIDC_DISCOVERY_UNAVAILABLE");
    await expect(client.start("/")).resolves.toMatchObject({
      authorizationUrl: expect.stringContaining("/api/oidc/authorize"),
    });
  });
});
