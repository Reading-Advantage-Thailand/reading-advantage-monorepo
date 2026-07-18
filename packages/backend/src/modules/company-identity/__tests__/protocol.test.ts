import { createHash, generateKeyPairSync } from "node:crypto";

import { describe, expect, it } from "vitest";

import {
  createRs256IdentityTokenSigner,
  fingerprintSecret,
  hashBearerToken,
  projectSecretSafeAuditMetadata,
  verifyPkceS256,
} from "../protocol.js";

describe("company identity protocol primitives", () => {
  it("verifies exact S256 PKCE challenges", () => {
    const verifier = "a-secure-pkce-verifier-value-that-is-43-characters-long";
    const challenge = createHash("sha256")
      .update(verifier)
      .digest("base64url");

    expect(verifyPkceS256(verifier, challenge)).toBe(true);
    expect(verifyPkceS256(`${verifier}x`, challenge)).toBe(false);
  });

  it("hashes bearer values without retaining the raw secret", () => {
    const raw = "opaque-session-token";
    const digest = hashBearerToken(raw);

    expect(digest).toMatch(/^[0-9a-f]{64}$/);
    expect(digest).not.toContain(raw);
  });

  it("binds idempotency to a keyed secret fingerprint without retaining plaintext", () => {
    const key = Buffer.alloc(32, 7);
    const first = fingerprintSecret(key, "credential-reset", "secret-one");
    expect(first).toMatch(/^[0-9a-f]{64}$/);
    expect(first).toBe(fingerprintSecret(key, "credential-reset", "secret-one"));
    expect(first).not.toBe(fingerprintSecret(key, "credential-reset", "secret-two"));
    expect(first).not.toContain("secret-one");
  });

  it("projects only reviewed, secret-safe audit metadata", () => {
    expect(
      projectSecretSafeAuditMetadata({
        source: "accounts-ui",
        roleKey: "SALES_REP",
        password: "must-not-survive",
        token: "must-not-survive",
        nested: { code: "must-not-survive" },
      }),
    ).toEqual({ source: "accounts-ui", roleKey: "SALES_REP" });
  });

  it("signs verifiable RS256 identity tokens with a stable key id", async () => {
    const { privateKey, publicKey } = generateKeyPairSync("rsa", {
      modulusLength: 2048,
    });
    const signer = createRs256IdentityTokenSigner({
      keyId: "accounts-2026-01",
      privateKey,
      publicKey,
      issuerUrl: "https://accounts.reading-advantage.com",
      clockSkewSeconds: 30,
      now: () => new Date(1_950_000_000 * 1000),
    });
    const token = await signer.sign({
      iss: "https://accounts.reading-advantage.com",
      sub: "2c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      username: "owner",
      displayName: "Company Owner",
      aud: "sales",
      exp: 2_000_000_000,
      iat: 1_900_000_000,
      nonce: "nonce",
      sid: "3c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      organizationId: "4c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      organizationKey: "internal-company",
      status: "ACTIVE",
      roles: ["SALES_REP"],
      authVersion: 1,
    });

    await expect(signer.verify(token, "sales", "nonce")).resolves.toMatchObject({
      aud: "sales",
      username: "owner",
      displayName: "Company Owner",
      roles: ["SALES_REP"],
    });
    await expect(signer.verify(token, "marketing", "nonce")).rejects.toThrow(
      "IDENTITY_TOKEN_AUDIENCE_INVALID",
    );
    await expect(signer.verify(token, "sales", "different-nonce")).rejects.toThrow(
      "IDENTITY_TOKEN_NONCE_INVALID",
    );
    expect(signer.jwk()).toMatchObject({ kid: "accounts-2026-01", alg: "RS256" });
  }, 15_000);

  it("rejects wrong issuer, expired, and future-issued signed claims with clock skew", async () => {
    const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
    const signer = createRs256IdentityTokenSigner({
      keyId: "accounts-2026-02",
      privateKey,
      issuerUrl: "https://accounts.reading-advantage.com",
      clockSkewSeconds: 30,
      now: () => new Date(2_000_000_000 * 1000),
    });
    const base = {
      sub: "2c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      username: "owner",
      displayName: "Company Owner",
      aud: "sales",
      nonce: "nonce",
      sid: "3c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      organizationId: "4c1b8f6e-b101-4c2a-a5a7-9b47f40d8621",
      organizationKey: "internal-company",
      status: "ACTIVE" as const,
      roles: ["SALES_REP"],
      authVersion: 1,
    };
    const wrongIssuer = await signer.sign({
      ...base,
      iss: "https://wrong.example.com",
      iat: 1_999_999_900,
      exp: 2_000_000_100,
    });
    const expired = await signer.sign({
      ...base,
      iss: "https://accounts.reading-advantage.com",
      iat: 1_999_999_900,
      exp: 1_999_999_970,
    });
    const future = await signer.sign({
      ...base,
      iss: "https://accounts.reading-advantage.com",
      iat: 2_000_000_031,
      exp: 2_000_000_100,
    });

    await expect(signer.verify(wrongIssuer, "sales", "nonce")).rejects.toThrow(
      "IDENTITY_TOKEN_ISSUER_INVALID",
    );
    await expect(signer.verify(expired, "sales", "nonce")).rejects.toThrow(
      "IDENTITY_TOKEN_EXPIRED",
    );
    await expect(signer.verify(future, "sales", "nonce")).rejects.toThrow(
      "IDENTITY_TOKEN_ISSUED_IN_FUTURE",
    );
  }, 15_000);
});
