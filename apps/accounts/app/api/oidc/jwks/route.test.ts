import { beforeEach, describe, expect, it, vi } from "vitest";

const { getIdentityComposition } = vi.hoisted(() => ({
  getIdentityComposition: vi.fn(),
}));

vi.mock("@/lib/server/identity", () => ({ getIdentityComposition }));

import { GET, HEAD, OPTIONS } from "./route";

const PUBLIC_JWK = { kty: "RSA", kid: "key-1", use: "sig", alg: "RS256", n: "modulus", e: "AQAB" };

describe("Accounts OIDC JWKS route", () => {
  beforeEach(() => {
    getIdentityComposition.mockReset();
    getIdentityComposition.mockResolvedValue({ jwk: PUBLIC_JWK });
  });

  it("publishes exactly the composition public key", async () => {
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ keys: [PUBLIC_JWK] });
  });

  it("answers HEAD without loading key material", () => {
    const response = HEAD();

    expect(response.status).toBe(204);
    expect(getIdentityComposition).not.toHaveBeenCalled();
  });

  it("answers preflight with the GET, HEAD, OPTIONS allow list", () => {
    const response = OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Allow")).toBe("GET, HEAD, OPTIONS");
  });
});
