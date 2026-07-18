import { generateKeyPairSync, sign as signBytes } from "node:crypto";

import { describe, expect, it, vi } from "vitest";

import { createCompanyOidcClient } from "../client.js";

const issuer = "https://accounts.reading-advantage.com";
const clientConfig = {
  issuerUrl: issuer,
  clientId: "sales-web",
  clientSecret: "s".repeat(32),
  redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
  expectedAudience: "sales",
  clockSkewSeconds: 30,
};

function signedToken(input: {
  readonly privateKey: ReturnType<typeof generateKeyPairSync>["privateKey"];
  readonly nonce: string;
}): string {
  const header = Buffer.from(JSON.stringify({
    alg: "RS256",
    kid: "test-key",
    typ: "JWT",
  })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({
    iss: issuer,
    sub: "20000000-0000-4000-8000-000000000001",
    username: "sales.rep",
    displayName: "Sales Rep",
    aud: "sales",
    exp: 2_000_000_100,
    iat: 1_999_999_900,
    nonce: input.nonce,
    sid: "20000000-0000-4000-8000-000000000002",
    organizationId: "20000000-0000-4000-8000-000000000003",
    organizationKey: "internal-company",
    status: "ACTIVE",
    roles: ["SALES_REP"],
    authVersion: 1,
  })).toString("base64url");
  const signingInput = `${header}.${payload}`;
  const signature = signBytes("RSA-SHA256", Buffer.from(signingInput), {
    key: input.privateKey,
    padding: 1,
  }).toString("base64url");
  return `${signingInput}.${signature}`;
}

function harness(
  tokenNonce = "n".repeat(43),
  transformToken: (token: string) => string = (token) => token,
) {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const exported = publicKey.export({ format: "jwk" });
  const discovery = {
    issuer,
    authorization_endpoint: `${issuer}/api/oidc/authorize`,
    token_endpoint: `${issuer}/api/oidc/token`,
    introspection_endpoint: `${issuer}/api/oidc/introspect`,
    end_session_endpoint: `${issuer}/api/oidc/logout`,
    jwks_uri: `${issuer}/api/oidc/jwks`,
    code_challenge_methods_supported: ["S256"],
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "profile", "roles"],
    token_endpoint_auth_methods_supported: ["client_secret_basic"],
  };
  const request = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
    const target = String(url);
    if (target.endsWith("/.well-known/openid-configuration")) {
      return Response.json(discovery);
    }
    if (target.endsWith("/api/oidc/jwks")) {
      return Response.json({ keys: [{
        alg: "RS256",
        use: "sig",
        kid: "test-key",
        kty: "RSA",
        n: exported.n,
        e: exported.e,
      }] });
    }
    if (target.endsWith("/api/oidc/token")) {
      expect(init?.headers).toMatchObject({
        Authorization: `Basic ${Buffer.from(`sales-web:${"s".repeat(32)}`).toString("base64")}`,
      });
      return Response.json({
        access_token: "a".repeat(43),
        token_type: "Bearer",
        expires_in: 3600,
        id_token: transformToken(signedToken({ privateKey, nonce: tokenNonce })),
      });
    }
    if (target.endsWith("/api/oidc/introspect")) {
      return Response.json({
        active: true,
        identity: {
          sub: "20000000-0000-4000-8000-000000000001",
          username: "sales.rep",
          displayName: "Sales Rep",
          aud: "sales",
          sid: "20000000-0000-4000-8000-000000000002",
          organizationId: "20000000-0000-4000-8000-000000000003",
          organizationKey: "internal-company",
          status: "ACTIVE",
          roles: ["SALES_REP"],
          authVersion: 1,
        },
        expiresAt: "2033-05-18T03:35:00.000Z",
      });
    }
    if (target.endsWith("/api/oidc/logout")) return new Response(null, { status: 204 });
    return new Response(null, { status: 404 });
  });
  const values = ["v".repeat(43), "s".repeat(43), "n".repeat(43)];
  const client = createCompanyOidcClient({
    config: clientConfig,
    fetch: request as typeof fetch,
    now: () => new Date(2_000_000_000 * 1000),
    createOpaqueValue: () => values.shift() ?? "x".repeat(43),
  });
  return { client, request };
}

describe("company OIDC client", () => {
  it("completes PKCE callback, verified session, introspection, and local logout", async () => {
    const { client } = harness();
    const started = await client.start("/en");
    const authorization = new URL(started.authorizationUrl);

    expect(authorization.searchParams.get("code_challenge_method")).toBe("S256");
    const session = await client.exchange({
      code: "c".repeat(43),
      state: authorization.searchParams.get("state")!,
      sealedTransaction: started.sealedTransaction,
    });
    expect(session).toMatchObject({
      accessToken: "a".repeat(43),
      returnTo: "/en",
      identity: {
        aud: "sales",
        username: "sales.rep",
        displayName: "Sales Rep",
        organizationKey: "internal-company",
        roles: ["SALES_REP"],
      },
    });
    await expect(client.introspect(session.accessToken)).resolves.toMatchObject({
      identity: { aud: "sales" },
    });
    await expect(client.logout(session.accessToken)).resolves.toBe(true);
  }, 15_000);

  it("rejects a signed callback token whose nonce does not match the transaction", async () => {
    const { client } = harness("wrong-nonce-with-sufficient-entropy-000000");
    const started = await client.start();
    const state = new URL(started.authorizationUrl).searchParams.get("state")!;

    await expect(client.exchange({
      code: "c".repeat(43),
      state,
      sealedTransaction: started.sealedTransaction,
    })).rejects.toThrow("COMPANY_OIDC_NONCE_INVALID");
  }, 15_000);

  it("rejects a signed token whose identity payload is changed after signing", async () => {
    const { client } = harness("n".repeat(43), (token) => {
      const [header, payload, signature] = token.split(".");
      const claims = JSON.parse(
        Buffer.from(payload!, "base64url").toString("utf8"),
      ) as Record<string, unknown>;
      claims.username = "tampered.user";
      const tamperedPayload = Buffer.from(JSON.stringify(claims)).toString("base64url");
      return `${header}.${tamperedPayload}.${signature}`;
    });
    const started = await client.start();
    const state = new URL(started.authorizationUrl).searchParams.get("state")!;

    await expect(client.exchange({
      code: "c".repeat(43),
      state,
      sealedTransaction: started.sealedTransaction,
    })).rejects.toThrow("COMPANY_OIDC_TOKEN_SIGNATURE_INVALID");
  }, 15_000);
});
