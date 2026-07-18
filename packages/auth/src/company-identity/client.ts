import {
  createHash,
  createHmac,
  createPublicKey,
  randomBytes,
  timingSafeEqual,
  verify as verifyBytes,
} from "node:crypto";

import { z } from "zod";

import type { CompanyIdentityServiceAuthConfig } from "./environment.js";

// OIDC providers may advertise additional standard capabilities; validate required fields and ignore extensions.
const discoverySchema = z.object({
  issuer: z.string().url(),
  authorization_endpoint: z.string().url(),
  token_endpoint: z.string().url(),
  introspection_endpoint: z.string().url(),
  end_session_endpoint: z.string().url(),
  jwks_uri: z.string().url(),
  code_challenge_methods_supported: z.array(z.string()),
});

const identitySchema = z.strictObject({
  sub: z.string().uuid(),
  username: z.string().min(1).max(64),
  displayName: z.string().min(1).max(200),
  aud: z.string().min(1),
  sid: z.string().uuid(),
  organizationId: z.string().uuid(),
  organizationKey: z.string().min(1),
  status: z.literal("ACTIVE"),
  roles: z.array(z.string()),
  authVersion: z.number().int().positive(),
});

const tokenClaimsSchema = identitySchema.extend({
  iss: z.string().url(),
  exp: z.number().int().positive(),
  iat: z.number().int().positive(),
  nonce: z.string().min(1),
});

const tokenResponseSchema = z.strictObject({
  access_token: z.string().min(32),
  token_type: z.literal("Bearer"),
  expires_in: z.number().int().positive(),
  id_token: z.string().min(32),
});

const introspectionSchema = z.strictObject({
  active: z.boolean(),
  identity: identitySchema.optional(),
  expiresAt: z.string().datetime({ offset: true }).optional(),
});

const jwksSchema = z.strictObject({
  keys: z.array(z.strictObject({
    alg: z.literal("RS256"),
    use: z.literal("sig"),
    kid: z.string().min(1),
    kty: z.literal("RSA"),
    n: z.string().min(1),
    e: z.string().min(1),
  })),
});

/**
 * Checks that a post-login path is host-relative and free of URL control characters.
 * @param value Candidate return path received from the product application.
 * @returns True when URL resolution cannot reinterpret the value as another origin.
 */
function isSafeRelativeReturnPath(value: string): boolean {
  if (!/^\/(?!\/)[^\\]*$/.test(value)) return false;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x1f || codeUnit === 0x7f) return false;
  }
  return true;
}

const transactionSchema = z.strictObject({
  state: z.string().min(32),
  nonce: z.string().min(32),
  codeVerifier: z.string().regex(/^[A-Za-z0-9._~-]{43,128}$/),
  returnTo: z.string().max(2_048).refine(isSafeRelativeReturnPath),
  createdAt: z.number().int().positive(),
});

/** One signed-in product identity returned by Accounts introspection. */
export type CompanyOidcIdentity = z.infer<typeof identitySchema>;

/** Short-lived browser transaction retained during the authorization redirect. */
export type CompanyOidcTransaction = z.infer<typeof transactionSchema>;

/** Successful product-local application session established by Accounts. */
export interface CompanyOidcSession {
  /** Opaque application bearer token stored only in an HttpOnly cookie. */
  readonly accessToken: string;
  /** Verified audience-specific employee identity. */
  readonly identity: CompanyOidcIdentity;
  /** Application-session expiry instant. */
  readonly expiresAt: string;
}

/** Provider-neutral confidential OIDC client used by company applications. */
export interface CompanyOidcClient {
  /**
   * Creates a PKCE-bound authorization redirect and signed browser transaction.
   * @param returnTo Safe local path to restore after callback.
   * @returns Accounts authorization URL and sealed transaction cookie value.
   */
  start(returnTo?: string): Promise<{
    readonly authorizationUrl: string;
    readonly sealedTransaction: string;
  }>;
  /**
   * Exchanges and verifies one callback using exact state, nonce, issuer, and audience.
   * @param input Callback code, state, and sealed transaction cookie.
   * @returns Opaque application session plus verified identity projection.
   */
  exchange(input: {
    readonly code: string;
    readonly state: string;
    readonly sealedTransaction: string;
  }): Promise<CompanyOidcSession & { readonly returnTo: string }>;
  /**
   * Resolves a live application token through authenticated Accounts introspection.
   * @param accessToken Opaque application bearer token.
   * @returns Current identity or null after expiry, suspension, or revocation.
   */
  introspect(accessToken: string): Promise<CompanyOidcSession | null>;
  /**
   * Revokes only this product application session.
   * @param accessToken Opaque application bearer token.
   * @returns Whether Accounts accepted the local logout request.
   */
  logout(accessToken: string): Promise<boolean>;
}

function opaqueValue(): string {
  return randomBytes(32).toString("base64url");
}

function equalSecret(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left);
  const rightBytes = Buffer.from(right);
  return leftBytes.length === rightBytes.length && timingSafeEqual(leftBytes, rightBytes);
}

function basicAuthorization(clientId: string, clientSecret: string): string {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`;
}

/**
 * Creates a reusable confidential OIDC client from validated company-auth configuration.
 * @param input Validated client config plus optional fetch, clock, and entropy ports.
 * @returns Provider-neutral OIDC client for callback, session, and logout routes.
 */
export function createCompanyOidcClient(input: {
  readonly config: CompanyIdentityServiceAuthConfig;
  readonly fetch?: typeof fetch;
  readonly now?: () => Date;
  readonly createOpaqueValue?: () => string;
}): CompanyOidcClient {
  const request = input.fetch ?? fetch;
  const now = input.now ?? (() => new Date());
  const createValue = input.createOpaqueValue ?? opaqueValue;
  let discoveryPromise: Promise<z.infer<typeof discoverySchema>> | undefined;

  async function discovery() {
    discoveryPromise ??= request(
      `${input.config.issuerUrl}/.well-known/openid-configuration`,
      { headers: { Accept: "application/json" }, cache: "no-store" },
    ).then(async (response) => {
      if (!response.ok) throw new Error("COMPANY_OIDC_DISCOVERY_UNAVAILABLE");
      const parsed = discoverySchema.parse(await response.json());
      if (
        parsed.issuer !== input.config.issuerUrl ||
        !parsed.code_challenge_methods_supported.includes("S256")
      ) {
        throw new Error("COMPANY_OIDC_DISCOVERY_INVALID");
      }
      for (const endpoint of [
        parsed.authorization_endpoint,
        parsed.token_endpoint,
        parsed.introspection_endpoint,
        parsed.end_session_endpoint,
        parsed.jwks_uri,
      ]) {
        if (new URL(endpoint).origin !== new URL(input.config.issuerUrl).origin) {
          throw new Error("COMPANY_OIDC_DISCOVERY_ORIGIN_INVALID");
        }
      }
      return parsed;
    });
    return discoveryPromise;
  }

  function seal(transaction: CompanyOidcTransaction): string {
    const payload = Buffer.from(JSON.stringify(transaction)).toString("base64url");
    const signature = createHmac("sha256", input.config.clientSecret)
      .update("company-oidc-transaction-v1\u0000")
      .update(payload)
      .digest("base64url");
    return `${payload}.${signature}`;
  }

  function unseal(value: string): CompanyOidcTransaction {
    const [payload, signature, extra] = value.split(".");
    if (!payload || !signature || extra !== undefined) {
      throw new Error("COMPANY_OIDC_TRANSACTION_INVALID");
    }
    const expected = createHmac("sha256", input.config.clientSecret)
      .update("company-oidc-transaction-v1\u0000")
      .update(payload)
      .digest("base64url");
    if (!equalSecret(signature, expected)) {
      throw new Error("COMPANY_OIDC_TRANSACTION_INVALID");
    }
    const transaction = transactionSchema.parse(
      JSON.parse(Buffer.from(payload, "base64url").toString("utf8")),
    );
    if (transaction.createdAt + 600_000 <= now().getTime()) {
      throw new Error("COMPANY_OIDC_TRANSACTION_EXPIRED");
    }
    return transaction;
  }

  async function verifyIdToken(token: string, expectedNonce: string) {
    const segments = token.split(".");
    if (segments.length !== 3) throw new Error("COMPANY_OIDC_TOKEN_MALFORMED");
    const [encodedHeader, encodedPayload, encodedSignature] = segments as [
      string,
      string,
      string,
    ];
    let header: { alg?: unknown; kid?: unknown; typ?: unknown };
    let payload: unknown;
    try {
      header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString("utf8"));
      payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
    } catch {
      throw new Error("COMPANY_OIDC_TOKEN_MALFORMED");
    }
    if (header.alg !== "RS256" || header.typ !== "JWT" || typeof header.kid !== "string") {
      throw new Error("COMPANY_OIDC_TOKEN_HEADER_INVALID");
    }
    const metadata = await discovery();
    const response = await request(metadata.jwks_uri, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("COMPANY_OIDC_JWKS_UNAVAILABLE");
    const key = jwksSchema.parse(await response.json()).keys
      .find((candidate) => candidate.kid === header.kid);
    if (!key) throw new Error("COMPANY_OIDC_SIGNING_KEY_UNKNOWN");
    const signatureValid = verifyBytes(
      "RSA-SHA256",
      Buffer.from(`${encodedHeader}.${encodedPayload}`),
      { key: createPublicKey({ key, format: "jwk" }), padding: 1 },
      Buffer.from(encodedSignature, "base64url"),
    );
    if (!signatureValid) throw new Error("COMPANY_OIDC_TOKEN_SIGNATURE_INVALID");
    const claims = tokenClaimsSchema.parse(payload);
    if (claims.iss !== input.config.issuerUrl) throw new Error("COMPANY_OIDC_ISSUER_INVALID");
    if (claims.aud !== input.config.expectedAudience) throw new Error("COMPANY_OIDC_AUDIENCE_INVALID");
    if (!equalSecret(claims.nonce, expectedNonce)) throw new Error("COMPANY_OIDC_NONCE_INVALID");
    const currentSeconds = Math.floor(now().getTime() / 1000);
    if (claims.exp + input.config.clockSkewSeconds <= currentSeconds) {
      throw new Error("COMPANY_OIDC_TOKEN_EXPIRED");
    }
    if (claims.iat > currentSeconds + input.config.clockSkewSeconds) {
      throw new Error("COMPANY_OIDC_TOKEN_ISSUED_IN_FUTURE");
    }
    return identitySchema.parse({
      sub: claims.sub,
      username: claims.username,
      displayName: claims.displayName,
      aud: claims.aud,
      sid: claims.sid,
      organizationId: claims.organizationId,
      organizationKey: claims.organizationKey,
      status: claims.status,
      roles: claims.roles,
      authVersion: claims.authVersion,
    });
  }

  return Object.freeze({
    async start(returnTo = "/") {
      const safeReturnTo = transactionSchema.shape.returnTo.parse(returnTo);
      const metadata = await discovery();
      const codeVerifier = createValue();
      const transaction = transactionSchema.parse({
        state: createValue(),
        nonce: createValue(),
        codeVerifier,
        returnTo: safeReturnTo,
        createdAt: now().getTime(),
      });
      const authorizationUrl = new URL(metadata.authorization_endpoint);
      authorizationUrl.search = new URLSearchParams({
        client_id: input.config.clientId,
        redirect_uri: input.config.redirectUri,
        response_type: "code",
        scope: "openid profile",
        state: transaction.state,
        nonce: transaction.nonce,
        code_challenge: createHash("sha256").update(codeVerifier).digest("base64url"),
        code_challenge_method: "S256",
      }).toString();
      return { authorizationUrl: authorizationUrl.toString(), sealedTransaction: seal(transaction) };
    },

    async exchange(exchangeInput: {
      readonly code: string;
      readonly state: string;
      readonly sealedTransaction: string;
    }) {
      const transaction = unseal(exchangeInput.sealedTransaction);
      if (!equalSecret(transaction.state, exchangeInput.state)) {
        throw new Error("COMPANY_OIDC_STATE_INVALID");
      }
      const metadata = await discovery();
      const response = await request(metadata.token_endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: basicAuthorization(input.config.clientId, input.config.clientSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: exchangeInput.code,
          redirect_uri: input.config.redirectUri,
          code_verifier: transaction.codeVerifier,
        }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("COMPANY_OIDC_CODE_EXCHANGE_FAILED");
      const tokens = tokenResponseSchema.parse(await response.json());
      const identity = await verifyIdToken(tokens.id_token, transaction.nonce);
      return {
        accessToken: tokens.access_token,
        identity,
        expiresAt: new Date(now().getTime() + tokens.expires_in * 1000).toISOString(),
        returnTo: transaction.returnTo,
      };
    },

    async introspect(accessToken: string) {
      const metadata = await discovery();
      const response = await request(metadata.introspection_endpoint, {
        method: "POST",
        headers: {
          Accept: "application/json",
          Authorization: basicAuthorization(input.config.clientId, input.config.clientSecret),
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({ token: accessToken }),
        cache: "no-store",
      });
      if (!response.ok) throw new Error("COMPANY_OIDC_INTROSPECTION_FAILED");
      const result = introspectionSchema.parse(await response.json());
      if (!result.active || !result.identity || !result.expiresAt) return null;
      if (result.identity.aud !== input.config.expectedAudience) return null;
      return { accessToken, identity: result.identity, expiresAt: result.expiresAt };
    },

    async logout(accessToken: string) {
      const metadata = await discovery();
      const response = await request(metadata.end_session_endpoint, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      });
      return response.ok;
    },
  });
}
