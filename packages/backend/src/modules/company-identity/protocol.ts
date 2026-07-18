import {
  createHash,
  createHmac,
  createPublicKey,
  sign as signBytes,
  timingSafeEqual,
  verify as verifyBytes,
  type KeyObject,
} from "node:crypto";

import {
  companyIdentityClaimsSchema,
  type CompanyIdentityClaims,
} from "./contracts.js";

const PKCE_VERIFIER_PATTERN = /^[A-Za-z0-9._~-]{43,128}$/;
const PKCE_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const AUDIT_METADATA_KEYS = new Set([
  "source",
  "previousStatus",
  "newStatus",
  "roleKey",
  "clientId",
  "credentialAlgorithm",
  "sessionCount",
  "normalizationVersion",
  "migrationRunId",
  "sourcePrincipalId",
  "sourceFingerprint",
  "idempotencyReplay",
  "expiresAt",
  "reasonCategory",
]);

/** Public JSON Web Key exposed by the Accounts discovery endpoint. */
export interface IdentityPublicJwk {
  /** Signing algorithm. */
  readonly alg: "RS256";
  /** Intended key use. */
  readonly use: "sig";
  /** Stable rotation identifier. */
  readonly kid: string;
  /** RSA key type. */
  readonly kty: "RSA";
  /** RSA modulus. */
  readonly n: string;
  /** RSA exponent. */
  readonly e: string;
}

/** Provider-neutral identity-token signing and verification adapter. */
export interface IdentityTokenSigner {
  /**
   * Signs validated audience-specific identity claims.
   * @param claims Claims to protect in an RS256 ID token.
   * @returns A compact signed JSON Web Token.
   */
  sign(claims: Readonly<CompanyIdentityClaims>): Promise<string>;
  /**
   * Verifies signature, structure, expiry, issuer fields, and exact audience.
   * @param token Compact signed JSON Web Token.
   * @param expectedAudience Exact application audience.
   * @param expectedNonce Exact one-time nonce retained by the initiating client.
   * @returns Validated identity claims.
   * @throws When the token is malformed, unsigned, expired, or for another audience.
   */
  verify(
    token: string,
    expectedAudience: string,
    expectedNonce: string,
  ): Promise<CompanyIdentityClaims>;
  /**
   * Returns the public signing key without private material.
   * @returns Public RSA JSON Web Key.
   */
  jwk(): IdentityPublicJwk;
}

/** Computes the storage-safe SHA-256 digest of an opaque bearer value. */
export function hashBearerToken(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

/**
 * Creates a deterministic, context-bound secret fingerprint for idempotency only.
 * @param key Strong private key bytes unavailable to database readers.
 * @param context Stable operation context preventing cross-purpose correlation.
 * @param secret Secret input that must never be persisted directly.
 * @returns Lowercase keyed digest safe to bind into an idempotency request hash.
 */
export function fingerprintSecret(
  key: Buffer,
  context: string,
  secret: string,
): string {
  if (key.byteLength < 32) throw new Error("IDENTITY_FINGERPRINT_KEY_TOO_SHORT");
  return createHmac("sha256", key)
    .update(context, "utf8")
    .update("\u0000", "utf8")
    .update(secret, "utf8")
    .digest("hex");
}

/**
 * Verifies an RFC 7636 S256 proof using constant-time digest comparison.
 * @param verifier Raw PKCE verifier presented at token exchange.
 * @param expectedChallenge Exact registered S256 challenge.
 * @returns Whether the proof is valid.
 */
export function verifyPkceS256(
  verifier: string,
  expectedChallenge: string,
): boolean {
  if (
    !PKCE_VERIFIER_PATTERN.test(verifier) ||
    !PKCE_CHALLENGE_PATTERN.test(expectedChallenge)
  ) {
    return false;
  }
  const actual = createHash("sha256").update(verifier).digest("base64url");
  const actualBytes = Buffer.from(actual, "utf8");
  const expectedBytes = Buffer.from(expectedChallenge, "utf8");
  return (
    actualBytes.byteLength === expectedBytes.byteLength &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

/**
 * Retains only flat, reviewed audit metadata values and drops secret-bearing fields.
 * @param candidate Untrusted operation metadata.
 * @returns A new secret-safe metadata object accepted by the identity ledger.
 */
export function projectSecretSafeAuditMetadata(
  candidate: Readonly<Record<string, unknown>>,
): Readonly<Record<string, boolean | number | string | null>> {
  const result: Record<string, boolean | number | string | null> = {};
  for (const [key, value] of Object.entries(candidate)) {
    if (
      AUDIT_METADATA_KEYS.has(key) &&
      (value === null ||
        typeof value === "boolean" ||
        typeof value === "number" ||
        typeof value === "string")
    ) {
      result[key] = value;
    }
  }
  return Object.freeze(result);
}

/**
 * Constructs an RS256 signing adapter behind the provider-neutral token port.
 * @param input Stable key ID and asymmetric signing key pair.
 * @returns Identity-token adapter plus public JWK projection.
 */
export function createRs256IdentityTokenSigner(input: {
  readonly keyId: string;
  readonly privateKey: KeyObject;
  readonly publicKey?: KeyObject;
  readonly issuerUrl: string;
  readonly clockSkewSeconds: number;
  readonly now?: () => Date;
}): IdentityTokenSigner {
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(input.keyId)) {
    throw new Error("IDENTITY_SIGNING_KEY_ID_INVALID");
  }
  const publicKey = input.publicKey ?? createPublicKey(input.privateKey);
  const issuerUrl = new URL(input.issuerUrl).toString().replace(/\/$/, "");
  if (issuerUrl !== input.issuerUrl) {
    throw new Error("IDENTITY_TOKEN_ISSUER_INVALID");
  }
  if (!Number.isInteger(input.clockSkewSeconds) ||
      input.clockSkewSeconds < 0 || input.clockSkewSeconds > 120) {
    throw new Error("IDENTITY_TOKEN_CLOCK_SKEW_INVALID");
  }
  const now = input.now ?? (() => new Date());
  const exported = publicKey.export({ format: "jwk" });
  if (exported.kty !== "RSA" || !exported.n || !exported.e) {
    throw new Error("IDENTITY_SIGNING_KEY_INVALID");
  }
  const jwk: IdentityPublicJwk = Object.freeze({
    alg: "RS256",
    use: "sig",
    kid: input.keyId,
    kty: "RSA",
    n: exported.n,
    e: exported.e,
  });

  return Object.freeze({
    async sign(claims: Readonly<CompanyIdentityClaims>): Promise<string> {
      const validated = companyIdentityClaimsSchema.parse(claims);
      const header = Buffer.from(
        JSON.stringify({ alg: "RS256", kid: input.keyId, typ: "JWT" }),
      ).toString("base64url");
      const payload = Buffer.from(JSON.stringify(validated)).toString(
        "base64url",
      );
      const signingInput = `${header}.${payload}`;
      const signature = signBytes("RSA-SHA256", Buffer.from(signingInput), {
        key: input.privateKey,
        padding: 1,
      }).toString("base64url");
      return `${signingInput}.${signature}`;
    },
    async verify(
      token: string,
      expectedAudience: string,
      expectedNonce: string,
    ): Promise<CompanyIdentityClaims> {
      const segments = token.split(".");
      if (segments.length !== 3) throw new Error("IDENTITY_TOKEN_MALFORMED");
      const [encodedHeader, encodedPayload, encodedSignature] = segments as [
        string,
        string,
        string,
      ];
      let header: unknown;
      let payload: unknown;
      try {
        header = JSON.parse(Buffer.from(encodedHeader, "base64url").toString());
        payload = JSON.parse(
          Buffer.from(encodedPayload, "base64url").toString(),
        );
      } catch {
        throw new Error("IDENTITY_TOKEN_MALFORMED");
      }
      if (
        typeof header !== "object" ||
        header === null ||
        (header as Record<string, unknown>).alg !== "RS256" ||
        (header as Record<string, unknown>).kid !== input.keyId ||
        (header as Record<string, unknown>).typ !== "JWT"
      ) {
        throw new Error("IDENTITY_TOKEN_HEADER_INVALID");
      }
      const validSignature = verifyBytes(
        "RSA-SHA256",
        Buffer.from(`${encodedHeader}.${encodedPayload}`),
        { key: publicKey, padding: 1 },
        Buffer.from(encodedSignature, "base64url"),
      );
      if (!validSignature) throw new Error("IDENTITY_TOKEN_SIGNATURE_INVALID");
      const claims = companyIdentityClaimsSchema.parse(payload);
      if (claims.iss !== issuerUrl) {
        throw new Error("IDENTITY_TOKEN_ISSUER_INVALID");
      }
      if (claims.aud !== expectedAudience) {
        throw new Error("IDENTITY_TOKEN_AUDIENCE_INVALID");
      }
      if (claims.nonce !== expectedNonce) {
        throw new Error("IDENTITY_TOKEN_NONCE_INVALID");
      }
      const currentSeconds = Math.floor(now().getTime() / 1000);
      if (claims.exp + input.clockSkewSeconds <= currentSeconds) {
        throw new Error("IDENTITY_TOKEN_EXPIRED");
      }
      if (claims.iat > currentSeconds + input.clockSkewSeconds) {
        throw new Error("IDENTITY_TOKEN_ISSUED_IN_FUTURE");
      }
      return claims;
    },
    jwk(): IdentityPublicJwk {
      return jwk;
    },
  });
}
