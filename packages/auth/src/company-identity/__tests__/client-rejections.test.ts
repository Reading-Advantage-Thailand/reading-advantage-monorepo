import { createHmac, generateKeyPairSync, sign as signBytes } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { createCompanyOidcClient, parseCompanyOidcReturnTo } from "../client.js";

const issuer = "https://accounts.reading-advantage.com";
const secret = "s".repeat(32);
const config = {
  issuerUrl: issuer,
  clientId: "sales-web",
  clientSecret: secret,
  redirectUri: "https://sales.reading-advantage.com/api/auth/callback",
  expectedAudience: "sales",
  clockSkewSeconds: 30,
};
const NOW_S = 2_000_000_000;
const NONCE = "n".repeat(43);
const STATE = "s".repeat(43);

const { privateKey, publicKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
const other = generateKeyPairSync("rsa", { modulusLength: 2048 });
const jwk = publicKey.export({ format: "jwk" });

const identity = {
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

/** Base64url-encodes a JSON value. */
function b64(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Signs an ID token with optional header and claim overrides. */
function idToken(opts: {
  header?: Record<string, unknown>;
  claims?: Record<string, unknown>;
  key?: typeof privateKey;
} = {}): string {
  const header = b64({ alg: "RS256", kid: "test-key", typ: "JWT", ...opts.header });
  const payload = b64({
    iss: issuer,
    exp: NOW_S + 100,
    iat: NOW_S - 100,
    nonce: NONCE,
    ...identity,
    ...opts.claims,
  });
  const signature = signBytes("RSA-SHA256", Buffer.from(`${header}.${payload}`), {
    key: opts.key ?? privateKey,
    padding: 1,
  }).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Seals a transaction the way the client does, for unseal tests. */
function seal(transaction: Record<string, unknown>, key = secret): string {
  const payload = b64(transaction);
  const sig = createHmac("sha256", key)
    .update("company-oidc-transaction-v1\u0000")
    .update(payload)
    .digest("base64url");
  return `${payload}.${sig}`;
}

/** Builds a valid transaction body with optional overrides. */
function transaction(over: Record<string, unknown> = {}) {
  return {
    state: STATE,
    nonce: NONCE,
    codeVerifier: "v".repeat(43),
    returnTo: "/",
    createdAt: NOW_S * 1000,
    ...over,
  };
}

type Routes = {
  discovery?: () => Response;
  jwks?: () => Response;
  token?: () => Response;
  introspect?: () => Response;
  logout?: () => Response;
};

/** Builds a client whose fetch routes can be overridden per endpoint. */
function harness(routes: Routes = {}, nowMs = NOW_S * 1000) {
  const request = vi.fn(async (url: string | URL | Request, _init?: RequestInit) => {
    const target = String(url);
    if (target.endsWith("/.well-known/openid-configuration")) {
      return (routes.discovery ?? (() => Response.json(discoveryDoc)))();
    }
    if (target.endsWith("/api/oidc/jwks")) {
      return (routes.jwks ?? (() => Response.json({ keys: [{
        alg: "RS256", use: "sig", kid: "test-key", kty: "RSA", n: jwk.n, e: jwk.e,
      }] })))();
    }
    if (target.endsWith("/api/oidc/token")) {
      return (routes.token ?? (() => tokenResponse(idToken())))();
    }
    if (target.endsWith("/api/oidc/introspect")) {
      return (routes.introspect ?? (() => Response.json({
        active: true, identity, expiresAt: "2033-05-18T03:35:00.000Z",
      })))();
    }
    if (target.endsWith("/api/oidc/logout")) {
      return (routes.logout ?? (() => new Response(null, { status: 204 })))();
    }
    return new Response(null, { status: 404 });
  });
  const client = createCompanyOidcClient({
    config,
    fetch: request as typeof fetch,
    now: () => new Date(nowMs),
  });
  return { client, request };
}

/** Builds a token endpoint response that carries the given ID token. */
function tokenResponse(id_token: string): Response {
  return Response.json({
    access_token: "a".repeat(43),
    token_type: "Bearer",
    expires_in: 3600,
    id_token,
  });
}

/** Runs one exchange with a valid sealed transaction. */
function exchange(client: ReturnType<typeof harness>["client"], over: Record<string, unknown> = {}) {
  return client.exchange({
    code: "code-1",
    state: STATE,
    sealedTransaction: seal(transaction()),
    ...over,
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("return path validation", () => {
  it.each([
    ["a format character", "/a‎b"],
    ["a bidi isolate", "/⁦x"],
    ["a tab", "/a\tb"],
    ["a newline", "/a\nb"],
    ["a DEL character", "/a\u007fb"],
    ["a backslash", "/a\\b"],
    ["a protocol-relative path", "//evil.example"],
    ["a relative path", "next"],
  ])("rejects %s", (_label, value) => {
    expect(() => parseCompanyOidcReturnTo(value)).toThrow();
  });

  it("rejects a path longer than 2048 characters", () => {
    expect(() => parseCompanyOidcReturnTo(`/${"a".repeat(2048)}`)).toThrow();
    expect(parseCompanyOidcReturnTo(`/${"a".repeat(2047)}`)).toHaveLength(2048);
  });
});

describe("discovery checks", () => {
  it("fails when discovery is unavailable", async () => {
    const { client } = harness({ discovery: () => new Response(null, { status: 503 }) });
    await expect(client.start("/")).rejects.toThrow("COMPANY_OIDC_DISCOVERY_UNAVAILABLE");
  });

  it("fails when the issuer does not match", async () => {
    const { client } = harness({
      discovery: () => Response.json({ ...discoveryDoc, issuer: "https://accounts.example" }),
    });
    await expect(client.start("/")).rejects.toThrow("COMPANY_OIDC_DISCOVERY_INVALID");
  });

  it("fails when S256 PKCE is not supported", async () => {
    const { client } = harness({
      discovery: () => Response.json({ ...discoveryDoc, code_challenge_methods_supported: ["plain"] }),
    });
    await expect(client.start("/")).rejects.toThrow("COMPANY_OIDC_DISCOVERY_INVALID");
  });

  it.each([
    "authorization_endpoint",
    "token_endpoint",
    "introspection_endpoint",
    "end_session_endpoint",
    "jwks_uri",
  ])("fails when %s points at another origin", async (field) => {
    const { client } = harness({
      discovery: () => Response.json({ ...discoveryDoc, [field]: "https://evil.example/x" }),
    });
    await expect(client.introspect("t")).rejects.toThrow("COMPANY_OIDC_DISCOVERY_ORIGIN_INVALID");
  });

  it("fetches discovery once per client", async () => {
    const { client, request } = harness();
    await client.start("/");
    await client.introspect("t");
    await client.logout("t");

    const discoveryCalls = request.mock.calls.filter(([u]) =>
      String(u).endsWith("/.well-known/openid-configuration"));
    expect(discoveryCalls).toHaveLength(1);
  });
});

describe("default ports", () => {
  it("uses global fetch, the real clock, and random values when none are passed", async () => {
    const globalFetch = vi.fn(async () => Response.json(discoveryDoc));
    vi.stubGlobal("fetch", globalFetch);
    const client = createCompanyOidcClient({ config });

    const first = await client.start("/home");
    const second = await client.start("/home");

    expect(globalFetch).toHaveBeenCalledTimes(1);
    expect(first.sealedTransaction).not.toBe(second.sealedTransaction);
    const url = new URL(first.authorizationUrl);
    expect(url.searchParams.get("state")).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const body = JSON.parse(Buffer.from(first.sealedTransaction.split(".")[0], "base64url").toString());
    expect(Math.abs(body.createdAt - Date.now())).toBeLessThan(5000);
    expect(body.returnTo).toBe("/home");
  });
});

describe("transaction unseal", () => {
  it.each([
    ["no signature", "abc"],
    ["an empty payload", ".sig"],
    ["an extra segment", "a.b.c"],
  ])("rejects a sealed value with %s", async (_label, sealed) => {
    const { client } = harness();
    await expect(exchange(client, { sealedTransaction: sealed })).rejects.toThrow(
      "COMPANY_OIDC_TRANSACTION_INVALID",
    );
  });

  it("rejects a transaction sealed with another secret", async () => {
    const { client } = harness();
    await expect(
      exchange(client, { sealedTransaction: seal(transaction(), "x".repeat(32)) }),
    ).rejects.toThrow("COMPANY_OIDC_TRANSACTION_INVALID");
  });

  it("rejects a transaction at exactly ten minutes old", async () => {
    const { client } = harness({}, NOW_S * 1000 + 600_000);
    await expect(exchange(client)).rejects.toThrow("COMPANY_OIDC_TRANSACTION_EXPIRED");
  });

  it("accepts a transaction one millisecond before ten minutes", async () => {
    const token = idToken({ claims: { exp: NOW_S + 3600 } });
    const { client } = harness({ token: () => tokenResponse(token) }, NOW_S * 1000 + 599_999);
    await expect(exchange(client)).resolves.toMatchObject({ returnTo: "/" });
  });

  it("rejects a signed transaction with an unsafe return path", async () => {
    const { client } = harness();
    await expect(
      exchange(client, { sealedTransaction: seal(transaction({ returnTo: "//evil.example" })) }),
    ).rejects.toThrow();
  });

  it("rejects a callback state that does not match", async () => {
    const { client, request } = harness();
    await expect(exchange(client, { state: "t".repeat(43) })).rejects.toThrow(
      "COMPANY_OIDC_STATE_INVALID",
    );
    expect(request).not.toHaveBeenCalled();
  });
});

describe("code exchange", () => {
  it("fails when the token endpoint rejects the code", async () => {
    const { client } = harness({ token: () => new Response(null, { status: 400 }) });
    await expect(exchange(client)).rejects.toThrow("COMPANY_OIDC_CODE_EXCHANGE_FAILED");
  });

  it("sends the code, redirect URI, and verifier to the token endpoint", async () => {
    const { client, request } = harness();
    const result = await exchange(client);

    const call = request.mock.calls.find(([u]) => String(u).endsWith("/api/oidc/token"));
    const init = call?.[1] as RequestInit;
    const body = init.body as URLSearchParams;
    expect(init.method).toBe("POST");
    expect(body.get("grant_type")).toBe("authorization_code");
    expect(body.get("code")).toBe("code-1");
    expect(body.get("redirect_uri")).toBe(config.redirectUri);
    expect(body.get("code_verifier")).toBe("v".repeat(43));
    expect(result.expiresAt).toBe(new Date(NOW_S * 1000 + 3_600_000).toISOString());
    expect(result.identity).toEqual(identity);
  });
});

describe("ID token verification", () => {
  /** Runs an exchange whose token endpoint returns the given ID token. */
  function exchangeWith(token: string, jwks?: () => Response) {
    const { client } = harness({ token: () => tokenResponse(token), jwks });
    return exchange(client);
  }

  it("rejects a token without three segments", async () => {
    await expect(exchangeWith(`${"a".repeat(20)}.${"b".repeat(20)}`)).rejects.toThrow(
      "COMPANY_OIDC_TOKEN_MALFORMED",
    );
  });

  it("rejects a token whose header is not JSON", async () => {
    await expect(exchangeWith(`${"x".repeat(20)}.${b64({})}.${"c".repeat(20)}`)).rejects.toThrow(
      "COMPANY_OIDC_TOKEN_MALFORMED",
    );
  });

  it.each([
    ["an HS256 algorithm", { alg: "HS256" }],
    ["a none algorithm", { alg: "none" }],
    ["a wrong type", { typ: "JWS" }],
    ["a numeric key id", { kid: 7 }],
  ])("rejects a header with %s", async (_label, header) => {
    await expect(exchangeWith(idToken({ header }))).rejects.toThrow(
      "COMPANY_OIDC_TOKEN_HEADER_INVALID",
    );
  });

  it("fails when the key set is unavailable", async () => {
    await expect(
      exchangeWith(idToken(), () => new Response(null, { status: 500 })),
    ).rejects.toThrow("COMPANY_OIDC_JWKS_UNAVAILABLE");
  });

  it("rejects a token signed with an unknown key id", async () => {
    await expect(exchangeWith(idToken({ header: { kid: "other" } }))).rejects.toThrow(
      "COMPANY_OIDC_SIGNING_KEY_UNKNOWN",
    );
  });

  it("rejects a token signed by a different private key", async () => {
    await expect(exchangeWith(idToken({ key: other.privateKey }))).rejects.toThrow(
      "COMPANY_OIDC_TOKEN_SIGNATURE_INVALID",
    );
  });

  it("rejects another issuer", async () => {
    await expect(
      exchangeWith(idToken({ claims: { iss: "https://accounts.example" } })),
    ).rejects.toThrow("COMPANY_OIDC_ISSUER_INVALID");
  });

  it("rejects another audience", async () => {
    await expect(exchangeWith(idToken({ claims: { aud: "reading" } }))).rejects.toThrow(
      "COMPANY_OIDC_AUDIENCE_INVALID",
    );
  });

  it("rejects a token at the expiry plus skew boundary", async () => {
    await expect(exchangeWith(idToken({ claims: { exp: NOW_S - 30 } }))).rejects.toThrow(
      "COMPANY_OIDC_TOKEN_EXPIRED",
    );
  });

  it("accepts a token one second inside the skew", async () => {
    await expect(exchangeWith(idToken({ claims: { exp: NOW_S - 29 } }))).resolves.toMatchObject({
      accessToken: "a".repeat(43),
    });
  });

  it("rejects a token issued beyond the skew in the future", async () => {
    await expect(exchangeWith(idToken({ claims: { iat: NOW_S + 31 } }))).rejects.toThrow(
      "COMPANY_OIDC_TOKEN_ISSUED_IN_FUTURE",
    );
  });

  it("accepts a token issued at the skew edge", async () => {
    await expect(exchangeWith(idToken({ claims: { iat: NOW_S + 30 } }))).resolves.toBeDefined();
  });

  it("rejects a suspended identity", async () => {
    await expect(exchangeWith(idToken({ claims: { status: "SUSPENDED" } }))).rejects.toThrow();
  });

  it("rejects an unexpected extra claim", async () => {
    await expect(exchangeWith(idToken({ claims: { admin: true } }))).rejects.toThrow();
  });
});

describe("introspection and logout", () => {
  it("fails when introspection is unavailable", async () => {
    const { client } = harness({ introspect: () => new Response(null, { status: 401 }) });
    await expect(client.introspect("t")).rejects.toThrow("COMPANY_OIDC_INTROSPECTION_FAILED");
  });

  it.each([
    ["an inactive token", { active: false, identity, expiresAt: "2033-05-18T03:35:00.000Z" }],
    ["a missing identity", { active: true, expiresAt: "2033-05-18T03:35:00.000Z" }],
    ["a missing expiry", { active: true, identity }],
    ["another audience", {
      active: true,
      identity: { ...identity, aud: "reading" },
      expiresAt: "2033-05-18T03:35:00.000Z",
    }],
  ])("returns null for %s", async (_label, body) => {
    const { client } = harness({ introspect: () => Response.json(body) });
    await expect(client.introspect("t")).resolves.toBeNull();
  });

  it("sends the token with client basic auth", async () => {
    const { client, request } = harness();
    await expect(client.introspect("tok-1")).resolves.toMatchObject({ accessToken: "tok-1" });

    const call = request.mock.calls.find(([u]) => String(u).endsWith("/api/oidc/introspect"));
    const init = call?.[1] as RequestInit;
    expect((init.body as URLSearchParams).get("token")).toBe("tok-1");
    expect(init.headers).toMatchObject({
      Authorization: `Basic ${Buffer.from(`sales-web:${secret}`).toString("base64")}`,
    });
  });

  it("returns false when logout is refused", async () => {
    const { client } = harness({ logout: () => new Response(null, { status: 500 }) });
    await expect(client.logout("t")).resolves.toBe(false);
  });

  it("sends the access token as a bearer on logout", async () => {
    const { client, request } = harness();
    await expect(client.logout("tok-2")).resolves.toBe(true);

    const call = request.mock.calls.find(([u]) => String(u).endsWith("/api/oidc/logout"));
    expect((call?.[1] as RequestInit).headers).toEqual({ Authorization: "Bearer tok-2" });
  });
});
