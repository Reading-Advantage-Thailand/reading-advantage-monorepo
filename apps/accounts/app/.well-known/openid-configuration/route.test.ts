import { beforeEach, describe, expect, it, vi } from "vitest";

const { getIdentityComposition } = vi.hoisted(() => ({
  getIdentityComposition: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { GET, HEAD, OPTIONS } from "./route";

const ISSUER = "https://accounts.example.test";

describe("Accounts OpenID discovery route", () => {
  beforeEach(() => {
    getIdentityComposition.mockReset();
    getIdentityComposition.mockResolvedValue({ issuerUrl: ISSUER });
  });

  it("publishes issuer endpoints and the supported protocol profile", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      issuer: ISSUER,
      authorization_endpoint: `${ISSUER}/api/oidc/authorize`,
      token_endpoint: `${ISSUER}/api/oidc/token`,
      introspection_endpoint: `${ISSUER}/api/oidc/introspect`,
      end_session_endpoint: `${ISSUER}/api/oidc/logout`,
      jwks_uri: `${ISSUER}/api/oidc/jwks`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code"],
      subject_types_supported: ["public"],
      id_token_signing_alg_values_supported: ["RS256"],
      scopes_supported: ["openid", "profile"],
      code_challenge_methods_supported: ["S256"],
      token_endpoint_auth_methods_supported: ["none", "client_secret_basic"],
    });
  });

  it("answers HEAD without loading the composition", () => {
    const response = HEAD();

    expect(response.status).toBe(204);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(getIdentityComposition).not.toHaveBeenCalled();
  });

  it("answers preflight with the GET, HEAD, OPTIONS allow list", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });
});
