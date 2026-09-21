/**
 * Protocol-level test double for the Accounts OIDC identity provider.
 *
 * Backs the accounting SSO sign-in tests: it stubs global fetch so the real
 * `@reading-advantage/auth` confidential client runs end-to-end (discovery,
 * JWKS, token, introspection, end-session) against an in-memory issuer with a
 * real RSA signing key. This is test infrastructure only — no production code.
 */
import { generateKeyPairSync, sign as signRsa } from "node:crypto";

import { vi } from "vitest";

import { resolveAccountingCookieName } from "../company-oidc";

/** In-memory Accounts issuer served by the fetch double. */
export const ISSUER = "https://accounts.reading-advantage.test";
/** Public origin of the accounting app under test. */
export const PUBLIC_ORIGIN = "https://accounting.reading-advantage.test";
/** Registered accounting callback URI. */
export const REDIRECT_URI = `${PUBLIC_ORIGIN}/api/auth/callback`;
/** Registered confidential-client identifier for the accounting app. */
export const CLIENT_ID = "accounting-web";
/** Test-only confidential-client secret (at least 32 UTF-8 bytes). */
export const CLIENT_SECRET = "accounting-test-client-secret-0123456789";
/** Audience claim Accounts issues for the accounting application. */
export const AUDIENCE = "accounting";
/** Accounting application-session cookie. */
export const SESSION_COOKIE = resolveAccountingCookieName(
  "ra_accounting_session",
);
/** Short-lived accounting authorization transaction cookie. */
export const TRANSACTION_COOKIE = resolveAccountingCookieName(
  "ra_accounting_oidc_tx",
);
/** Opaque access token the IdP double issues from its token endpoint. */
export const OPAQUE_ACCESS_TOKEN =
  "accounting-opaque-access-token-0123456789abcdef";

const SIGNING_KEY_ID = "accounting-test-signing-key";

const keyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const publicJwk = keyPair.publicKey.export({ format: "jwk" });

const DISCOVERY = {
  issuer: ISSUER,
  authorization_endpoint: `${ISSUER}/api/oidc/authorize`,
  token_endpoint: `${ISSUER}/api/oidc/token`,
  introspection_endpoint: `${ISSUER}/api/oidc/introspect`,
  end_session_endpoint: `${ISSUER}/api/oidc/logout`,
  jwks_uri: `${ISSUER}/api/oidc/jwks`,
  code_challenge_methods_supported: ["S256"],
};

const JWKS = {
  keys: [
    {
      alg: "RS256",
      use: "sig",
      kid: SIGNING_KEY_ID,
      kty: publicJwk.kty as string,
      n: publicJwk.n as string,
      e: publicJwk.e as string,
    },
  ],
};

/** Identity shape Accounts returns from introspection and embeds in id_tokens. */
export interface TestIdentity {
  readonly sub: string;
  readonly username: string;
  readonly displayName: string;
  readonly aud: string;
  readonly sid: string;
  readonly organizationId: string;
  readonly organizationKey: string;
  readonly status: "ACTIVE";
  readonly roles: string[];
  readonly authVersion: number;
}

/** Builds a valid Accounts identity carrying the given application roles. */
export function testIdentity(roles: readonly string[]): TestIdentity {
  return {
    sub: "11111111-1111-4111-8111-111111111111",
    username: "accounting-user",
    displayName: "Accounting User",
    aud: AUDIENCE,
    sid: "22222222-2222-4222-8222-222222222222",
    organizationId: "33333333-3333-4333-8333-333333333333",
    organizationKey: "reading-advantage",
    status: "ACTIVE",
    roles: [...roles],
    authVersion: 1,
  };
}

function base64urlJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

/** Signs a realistically structured RS256 id_token with the double's key. */
export function signIdToken(identity: TestIdentity, nonce: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const header = base64urlJson({
    alg: "RS256",
    typ: "JWT",
    kid: SIGNING_KEY_ID,
  });
  const payload = base64urlJson({
    ...identity,
    iss: ISSUER,
    exp: nowSeconds + 3_600,
    iat: nowSeconds,
    nonce,
  });
  const signature = signRsa(
    "RSA-SHA256",
    Buffer.from(`${header}.${payload}`),
    keyPair.privateKey,
  ).toString("base64url");
  return `${header}.${payload}.${signature}`;
}

/** Points the accounting OIDC environment at the in-memory issuer. */
export function setCompanyAuthEnv(): void {
  process.env.COMPANY_AUTH_ISSUER_URL = ISSUER;
  process.env.COMPANY_AUTH_OIDC_CLIENT_ID = CLIENT_ID;
  process.env.COMPANY_AUTH_OIDC_CLIENT_SECRET = CLIENT_SECRET;
  process.env.COMPANY_AUTH_OIDC_REDIRECT_URI = REDIRECT_URI;
  process.env.COMPANY_AUTH_EXPECTED_AUDIENCE = AUDIENCE;
  process.env.COMPANY_AUTH_CLOCK_SKEW_SECONDS = "30";
}

/** One recorded confidential-client call to the token endpoint. */
export interface TokenRequestRecord {
  readonly grantType: string | null;
  readonly code: string | null;
  readonly codeVerifier: string | null;
  readonly authorization: string | null;
}

/** Control surface over the installed IdP fetch double. */
export interface IdpDouble {
  /** Every token-endpoint call made by the client under test. */
  readonly tokenRequests: TokenRequestRecord[];
  /** Opaque tokens the client presented to the introspection endpoint. */
  readonly introspectedTokens: string[];
  /** Bearer tokens the client presented to the end-session endpoint. */
  readonly endSessionTokens: string[];
  /** Arms the token endpoint to issue an id_token with this nonce and roles. */
  prepareCodeExchange(input: {
    readonly nonce: string;
    readonly roles: readonly string[];
  }): void;
  /** Sets the JSON body returned by the introspection endpoint. */
  setIntrospection(result: unknown): void;
  /** Toggles a network-level failure of the end-session endpoint. */
  setEndSessionFailure(fails: boolean): void;
}

function headerValue(
  init: RequestInit | undefined,
  name: string,
): string | null {
  if (!init?.headers) return null;
  return new Headers(init.headers).get(name);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

/** Installs the in-memory Accounts issuer as the global fetch implementation. */
export function installIdpFetchDouble(): IdpDouble {
  let codeExchange:
    | { readonly nonce: string; readonly roles: readonly string[] }
    | undefined;
  let introspection: unknown = { active: false };
  let endSessionFails = false;
  const tokenRequests: TokenRequestRecord[] = [];
  const introspectedTokens: string[] = [];
  const endSessionTokens: string[] = [];

  const fetchDouble = vi.fn(
    async (
      input: string | URL | Request,
      init?: RequestInit,
    ): Promise<Response> => {
      const url = new URL(
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url,
      );
      switch (url.href) {
        case `${ISSUER}/.well-known/openid-configuration`:
          return jsonResponse(DISCOVERY);
        case `${ISSUER}/api/oidc/jwks`:
          return jsonResponse(JWKS);
        case `${ISSUER}/api/oidc/token`: {
          const body = new URLSearchParams(String(init?.body ?? ""));
          tokenRequests.push({
            grantType: body.get("grant_type"),
            code: body.get("code"),
            codeVerifier: body.get("code_verifier"),
            authorization: headerValue(init, "authorization"),
          });
          if (!codeExchange) {
            return jsonResponse({ error: "unexpected_code_exchange" }, 400);
          }
          return jsonResponse({
            access_token: OPAQUE_ACCESS_TOKEN,
            token_type: "Bearer",
            expires_in: 3_600,
            id_token: signIdToken(
              testIdentity(codeExchange.roles),
              codeExchange.nonce,
            ),
          });
        }
        case `${ISSUER}/api/oidc/introspect`: {
          const body = new URLSearchParams(String(init?.body ?? ""));
          introspectedTokens.push(body.get("token") ?? "");
          return jsonResponse(introspection);
        }
        case `${ISSUER}/api/oidc/logout`: {
          if (endSessionFails) {
            throw new TypeError("fetch failed");
          }
          const authorization = headerValue(init, "authorization") ?? "";
          endSessionTokens.push(authorization.replace(/^Bearer\s+/, ""));
          return new Response(null, { status: 200 });
        }
        default:
          return new Response(`unexpected IdP request: ${url.href}`, {
            status: 500,
          });
      }
    },
  );
  vi.stubGlobal("fetch", fetchDouble);

  return {
    tokenRequests,
    introspectedTokens,
    endSessionTokens,
    prepareCodeExchange(input) {
      codeExchange = { nonce: input.nonce, roles: input.roles };
    },
    setIntrospection(result) {
      introspection = result;
    },
    setEndSessionFailure(fails) {
      endSessionFails = fails;
    },
  };
}

/** Restores the original global fetch implementation. */
export function uninstallIdpFetchDouble(): void {
  vi.unstubAllGlobals();
}

/** Returns every Set-Cookie header of a response as individual strings. */
export function responseCookies(response: Response): string[] {
  const headers = response.headers as Headers & {
    getSetCookie?: () => string[];
  };
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const combined = response.headers.get("set-cookie");
  return combined ? [combined] : [];
}

/** Finds one Set-Cookie header by exact cookie name. */
export function findCookie(
  response: Response,
  name: string,
): string | undefined {
  return responseCookies(response).find((cookie) =>
    cookie.startsWith(`${name}=`),
  );
}

/** Extracts the value segment from one serialized Set-Cookie header. */
export function cookieValue(setCookie: string): string {
  const start = setCookie.indexOf("=") + 1;
  const end = setCookie.indexOf(";");
  return setCookie.slice(start, end === -1 ? undefined : end);
}

/** Claims carried inside the sealed authorization-transaction cookie. */
export interface SealedTransactionClaims {
  readonly state: string;
  readonly nonce: string;
  readonly codeVerifier: string;
  readonly returnTo: string;
  readonly createdAt: number;
}

/** Decodes the payload segment of a sealed transaction cookie value. */
export function decodeTransaction(
  sealedValue: string,
): SealedTransactionClaims {
  const [payload] = sealedValue.split(".");
  return JSON.parse(
    Buffer.from(payload as string, "base64url").toString("utf8"),
  ) as SealedTransactionClaims;
}
