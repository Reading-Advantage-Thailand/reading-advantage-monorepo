import { z } from "zod";

import {
  COMPANY_USERNAME_NORMALIZATION_VERSION,
  normalizeCompanyUsernameV1,
} from "../normalization.js";

const NORMALIZED_USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;
const STABLE_KEY_PATTERN = /^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$/;
const APPLICATION_ROLE_KEY_PATTERN = /^[A-Z][A-Z0-9_]{0,63}$/;
const SHA256_HEX_PATTERN = /^[0-9a-f]{64}$/;
const AUDIT_OPERATION_PATTERN =
  /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?(?::[a-z0-9](?:[a-z0-9._-]*[a-z0-9])?)+$/;
const PKCE_S256_CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const ARGON2ID_HASH_PATTERN = /^\$argon2id\$/;
const BCRYPT_HASH_PATTERN = /^\$2[aby]\$/;
const UUID_SOURCE =
  "[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
const IDEMPOTENCY_SCOPE_PATTERN = new RegExp(
  `^(?:global|organization:${UUID_SOURCE}|account:${UUID_SOURCE})$`,
);

type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(jsonValueSchema),
  ]),
);

/**
 * Reports a stable validation issue on a specific stored-row field.
 * @param context The active Zod refinement context.
 * @param path The stored-row field that violates the contract.
 * @param message The secret-free rule description.
 * @returns Nothing.
 */
function addIssue(
  context: z.RefinementCtx,
  path: Array<string | number>,
  message: string,
): void {
  context.addIssue({ code: z.ZodIssueCode.custom, message, path });
}

/**
 * Determines whether a value contains a NUL or ASCII control character.
 * @param value The string to inspect.
 * @returns Whether the value contains a forbidden control character.
 */
function containsAsciiControl(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0);
    if (codePoint !== undefined && (codePoint <= 0x1f || codePoint === 0x7f)) {
      return true;
    }
  }
  return false;
}

/**
 * Determines whether a bounded database string is non-empty and control-free.
 * @param value The string to inspect.
 * @param maximumLength The maximum permitted JavaScript string length.
 * @returns Whether the string satisfies the bounded storage rule.
 */
function isBoundedText(value: string, maximumLength: number): boolean {
  return (
    value.length >= 1 &&
    value.length <= maximumLength &&
    !containsAsciiControl(value)
  );
}

/**
 * Validates an exact OIDC redirect URI without canonicalizing its stored value.
 * @param value The candidate absolute redirect URI.
 * @returns Whether the URI is HTTPS or an explicitly ported loopback HTTP URI.
 */
function isSafeRedirectUri(value: string): boolean {
  if (
    value.length === 0 ||
    value.length > 2048 ||
    value.includes("*") ||
    value !== value.trim()
  ) {
    return false;
  }

  let redirectUri: URL;
  try {
    redirectUri = new URL(value);
  } catch {
    return false;
  }

  if (
    redirectUri.username !== "" ||
    redirectUri.password !== "" ||
    redirectUri.hash !== ""
  ) {
    return false;
  }

  if (redirectUri.protocol === "https:") {
    return true;
  }

  const hostname = redirectUri.hostname.replace(/^\[|\]$/g, "");
  return (
    redirectUri.protocol === "http:" &&
    ["127.0.0.1", "::1", "localhost"].includes(hostname) &&
    redirectUri.port !== ""
  );
}

/** Strict UUID contract for a company account identifier. */
export const companyAccountIdSchema = z.string().uuid();

/** Company account identifier inferred from the UUID contract. */
export type CompanyAccountId = z.infer<typeof companyAccountIdSchema>;

/** Strict input contract that stores the NFKC-and-trimmed username spelling. */
export const companyUsernameInputSchema = z
  .string()
  .superRefine((value, context) => {
    try {
      normalizeCompanyUsernameV1(value);
    } catch {
      addIssue(
        context,
        [],
        "Username does not satisfy normalization Version 1.",
      );
    }
  })
  .transform((value) => value.normalize("NFKC").trim());

/** Case-preserving company username accepted at the DB normalization boundary. */
export type CompanyUsernameInput = z.infer<typeof companyUsernameInputSchema>;

/** Canonical lowercase username contract used for equality and uniqueness. */
export const normalizedCompanyUsernameSchema = z
  .string()
  .regex(NORMALIZED_USERNAME_PATTERN);

/** Canonical normalized company username. */
export type NormalizedCompanyUsername = z.infer<
  typeof normalizedCompanyUsernameSchema
>;

/** Literal provenance contract for the approved username normalization version. */
export const companyUsernameNormalizationVersionSchema = z.literal(
  COMPANY_USERNAME_NORMALIZATION_VERSION,
);

/** Approved username normalization provenance value. */
export type CompanyUsernameNormalizationVersion = z.infer<
  typeof companyUsernameNormalizationVersionSchema
>;

/** Exact lifecycle states persisted for a company account. */
export const companyAccountStatusSchema = z.enum(["ACTIVE", "SUSPENDED"]);

/** Persisted company account lifecycle state. */
export type CompanyAccountStatus = z.infer<typeof companyAccountStatusSchema>;

/** Exact password-hash algorithms accepted by identity persistence. */
export const passwordHashAlgorithmSchema = z.enum(["ARGON2ID", "BCRYPT"]);

/** Persisted password-hash algorithm discriminator. */
export type PasswordHashAlgorithm = z.infer<typeof passwordHashAlgorithmSchema>;

/** Stable key contract for the internal company organization. */
export const organizationStableKeySchema = z.string().regex(STABLE_KEY_PATTERN);

/** Stable internal-company organization key. */
export type OrganizationStableKey = z.infer<typeof organizationStableKeySchema>;

/** Exact organization kind permitted inside the employee identity boundary. */
export const companyOrganizationTypeSchema = z.literal("INTERNAL_COMPANY");

/** Internal company organization discriminator. */
export type CompanyOrganizationType = z.infer<
  typeof companyOrganizationTypeSchema
>;

/** Stable key contract for an employee-facing application registration. */
export const applicationStableKeySchema = z.string().regex(STABLE_KEY_PATTERN);

/** Stable employee-application key. */
export type ApplicationStableKey = z.infer<typeof applicationStableKeySchema>;

/** Exact additive company-wide roles owned by the identity system. */
export const companyRoleKeySchema = z.enum(["EMPLOYEE", "COMPANY_ADMIN"]);

/** Company-wide identity role key. */
export type CompanyRoleKey = z.infer<typeof companyRoleKeySchema>;

/** Grammar contract for application-owned role definition keys. */
export const applicationRoleKeySchema = z
  .string()
  .regex(APPLICATION_ROLE_KEY_PATTERN);

/** Application-scoped role key. */
export type ApplicationRoleKey = z.infer<typeof applicationRoleKeySchema>;

/** Exact lowercase hexadecimal contract for SHA-256 and HMAC digests. */
export const sha256HexSchema = z.string().regex(SHA256_HEX_PATTERN);

/** Lowercase SHA-256 or HMAC digest. */
export type Sha256Hex = z.infer<typeof sha256HexSchema>;

/** Lowercase colon-separated operation key used by audit and idempotency rows. */
export const auditOperationKeySchema = z
  .string()
  .max(128)
  .regex(AUDIT_OPERATION_PATTERN);

/** Stable audit or idempotency operation key. */
export type AuditOperationKey = z.infer<typeof auditOperationKeySchema>;

const storedDisplayNameSchema = z
  .string()
  .refine((value) => isBoundedText(value, 200));
const storedTimestampSchema = z.date();

/** Strict public-safe persistence projection for a company account. */
export const companyAccountStoredRowSchema = z
  .object({
    id: companyAccountIdSchema,
    username: companyUsernameInputSchema,
    normalizedUsername: normalizedCompanyUsernameSchema,
    normalizationVersion: companyUsernameNormalizationVersionSchema,
    displayName: storedDisplayNameSchema,
    status: companyAccountStatusSchema,
    authVersion: z.number().int().min(1),
    statusChangedAt: storedTimestampSchema,
    createdAt: storedTimestampSchema,
    updatedAt: storedTimestampSchema,
  })
  .strict();

/** Public-safe company account persistence row. */
export type CompanyAccountStoredRow = z.infer<
  typeof companyAccountStoredRowSchema
>;

/** Strict persistence contract for a password credential hash and provenance. */
export const companyPasswordCredentialStoredRowSchema = z
  .object({
    accountId: companyAccountIdSchema,
    passwordHash: z.string().min(1),
    algorithm: passwordHashAlgorithmSchema,
    credentialVersion: z.number().int().min(1),
    legacyImportedAt: storedTimestampSchema.nullable(),
    lastVerifiedAt: storedTimestampSchema.nullable(),
    createdAt: storedTimestampSchema,
    updatedAt: storedTimestampSchema,
  })
  .strict()
  .superRefine((row, context) => {
    const matchesAlgorithm =
      row.algorithm === "ARGON2ID"
        ? ARGON2ID_HASH_PATTERN.test(row.passwordHash)
        : BCRYPT_HASH_PATTERN.test(row.passwordHash);

    if (!matchesAlgorithm) {
      addIssue(
        context,
        ["passwordHash"],
        "Password hash prefix must match the declared algorithm.",
      );
    }
  });

/** Password credential persistence row. */
export type CompanyPasswordCredentialStoredRow = z.infer<
  typeof companyPasswordCredentialStoredRowSchema
>;

const oidcClientTypeSchema = z.enum(["PUBLIC", "CONFIDENTIAL"]);
const oidcTokenAuthMethodSchema = z.enum(["NONE", "CLIENT_SECRET_BASIC"]);
const oidcClientStatusSchema = z.enum(["ACTIVE", "DISABLED"]);

/** Strict persistence contract for a registered OIDC client. */
export const companyOidcClientStoredRowSchema = z
  .object({
    id: z.string().uuid(),
    applicationId: z.string().uuid(),
    clientId: z.string().refine((value) => isBoundedText(value, 128)),
    clientType: oidcClientTypeSchema,
    tokenAuthMethod: oidcTokenAuthMethodSchema,
    clientSecretHash: z.string().nullable(),
    secretVersion: z.number().int().min(1),
    pkceRequired: z.boolean(),
    status: oidcClientStatusSchema,
    createdAt: storedTimestampSchema,
    updatedAt: storedTimestampSchema,
  })
  .strict()
  .superRefine((row, context) => {
    if (row.clientType === "PUBLIC") {
      if (row.clientSecretHash !== null) {
        addIssue(
          context,
          ["clientSecretHash"],
          "Public clients must not persist a client secret hash.",
        );
      }
      if (row.tokenAuthMethod !== "NONE") {
        addIssue(
          context,
          ["tokenAuthMethod"],
          "Public clients must use the NONE token authentication method.",
        );
      }
    } else {
      if (row.tokenAuthMethod !== "CLIENT_SECRET_BASIC") {
        addIssue(
          context,
          ["tokenAuthMethod"],
          "Confidential clients must use CLIENT_SECRET_BASIC.",
        );
      }
      if (
        row.clientSecretHash === null ||
        !ARGON2ID_HASH_PATTERN.test(row.clientSecretHash)
      ) {
        addIssue(
          context,
          ["clientSecretHash"],
          "Confidential clients must persist an Argon2id secret hash.",
        );
      }
    }

    if (!row.pkceRequired) {
      addIssue(context, ["pkceRequired"], "All OIDC clients require PKCE.");
    }
  });

/** Registered OIDC client persistence row. */
export type CompanyOidcClientStoredRow = z.infer<
  typeof companyOidcClientStoredRowSchema
>;

/** Strict persistence contract for an exact registered OIDC redirect URI. */
export const companyOidcRedirectUriStoredRowSchema = z
  .object({
    id: z.string().uuid(),
    oidcClientId: z.string().uuid(),
    redirectUri: z.string().refine(isSafeRedirectUri),
    createdAt: storedTimestampSchema,
  })
  .strict();

/** Registered OIDC redirect URI persistence row. */
export type CompanyOidcRedirectUriStoredRow = z.infer<
  typeof companyOidcRedirectUriStoredRowSchema
>;

/** Strict persistence contract for an S256 one-time authorization code. */
export const companyOidcAuthorizationCodeStoredRowSchema = z
  .object({
    id: z.string().uuid(),
    codeHash: sha256HexSchema,
    oidcClientId: z.string().uuid(),
    redirectUriId: z.string().uuid(),
    ssoSessionId: z.string().uuid(),
    codeChallenge: z.string().regex(PKCE_S256_CHALLENGE_PATTERN),
    codeChallengeMethod: z.literal("S256"),
    nonce: z.string().refine((value) => isBoundedText(value, 255)),
    scope: z.array(z.string().min(1).max(128)).min(1),
    issuedAt: storedTimestampSchema,
    expiresAt: storedTimestampSchema,
    consumedAt: storedTimestampSchema.nullable(),
    revokedAt: storedTimestampSchema.nullable(),
  })
  .strict()
  .superRefine((row, context) => {
    const lifetimeMs = row.expiresAt.getTime() - row.issuedAt.getTime();
    if (lifetimeMs <= 0 || lifetimeMs > 5 * 60 * 1000) {
      addIssue(
        context,
        ["expiresAt"],
        "Authorization code expiry must be after issue and at most five minutes later.",
      );
    }

    if (row.consumedAt !== null && row.revokedAt !== null) {
      addIssue(
        context,
        ["consumedAt"],
        "Authorization code cannot be both consumed and revoked.",
      );
    }

    if (
      row.consumedAt !== null &&
      (row.consumedAt < row.issuedAt || row.consumedAt >= row.expiresAt)
    ) {
      addIssue(
        context,
        ["consumedAt"],
        "Authorization code consumption must occur within its exclusive lifetime.",
      );
    }

    if (!row.scope.includes("openid")) {
      addIssue(
        context,
        ["scope"],
        "OIDC authorization scope must include openid.",
      );
    }
  });

/** OIDC authorization-code persistence row containing hashes only. */
export type CompanyOidcAuthorizationCodeStoredRow = z.infer<
  typeof companyOidcAuthorizationCodeStoredRowSchema
>;

const auditTextSchema = z.string().refine((value) => isBoundedText(value, 255));

/** Strict global allowlist for secret-safe identity audit metadata. */
export const auditMetadataSchema = z
  .object({
    source: auditTextSchema.optional(),
    previousStatus: auditTextSchema.optional(),
    newStatus: auditTextSchema.optional(),
    roleKey: z
      .union([companyRoleKeySchema, applicationRoleKeySchema])
      .optional(),
    clientId: z
      .string()
      .refine((value) => isBoundedText(value, 128))
      .optional(),
    credentialAlgorithm: passwordHashAlgorithmSchema.optional(),
    sessionCount: z.number().int().safe().min(0).optional(),
    normalizationVersion: companyUsernameNormalizationVersionSchema.optional(),
    migrationRunId: z.string().uuid().optional(),
    sourcePrincipalId: auditTextSchema.optional(),
    sourceFingerprint: sha256HexSchema.optional(),
    idempotencyReplay: z.boolean().optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    reasonCategory: auditTextSchema.optional(),
  })
  .strict();

/** Secret-safe global audit metadata projection. */
export type AuditMetadata = z.infer<typeof auditMetadataSchema>;

const idempotencyStateSchema = z.enum(["IN_PROGRESS", "SUCCEEDED", "FAILED"]);
const safeErrorCodeSchema = z.string().regex(/^[A-Z][A-Z0-9_]{0,127}$/);

/** Strict persistence contract for a leased or terminal idempotency record. */
export const companyIdentityIdempotencyStoredRowSchema = z
  .object({
    id: z.string().uuid(),
    operation: auditOperationKeySchema,
    scopeKey: z.string().max(200).regex(IDEMPOTENCY_SCOPE_PATTERN),
    idempotencyKeyHash: sha256HexSchema,
    requestHash: sha256HexSchema,
    state: idempotencyStateSchema,
    ownerTokenHash: sha256HexSchema.nullable(),
    safeResult: jsonValueSchema.nullable(),
    safeErrorCode: safeErrorCodeSchema.nullable(),
    createdAt: storedTimestampSchema,
    leaseExpiresAt: storedTimestampSchema.nullable(),
    completedAt: storedTimestampSchema.nullable(),
    expiresAt: storedTimestampSchema,
  })
  .strict()
  .superRefine((row, context) => {
    if (row.expiresAt <= row.createdAt) {
      addIssue(
        context,
        ["expiresAt"],
        "Idempotency retention expiry must be later than creation.",
      );
    }
    if (row.completedAt !== null && row.completedAt < row.createdAt) {
      addIssue(
        context,
        ["completedAt"],
        "Idempotency completion cannot precede creation.",
      );
    }

    if (row.state === "IN_PROGRESS") {
      if (row.ownerTokenHash === null) {
        addIssue(
          context,
          ["ownerTokenHash"],
          "In-progress idempotency rows require an owner hash.",
        );
      }
      if (row.leaseExpiresAt === null) {
        addIssue(
          context,
          ["leaseExpiresAt"],
          "In-progress idempotency rows require a lease expiry.",
        );
      }
      if (row.completedAt !== null) {
        addIssue(
          context,
          ["completedAt"],
          "In-progress idempotency rows cannot be complete.",
        );
      }
      if (row.safeResult !== null) {
        addIssue(
          context,
          ["safeResult"],
          "In-progress idempotency rows cannot contain a result.",
        );
      }
      if (row.safeErrorCode !== null) {
        addIssue(
          context,
          ["safeErrorCode"],
          "In-progress idempotency rows cannot contain an error.",
        );
      }
      return;
    }

    if (row.ownerTokenHash !== null) {
      addIssue(
        context,
        ["ownerTokenHash"],
        "Terminal idempotency rows must clear lease ownership.",
      );
    }
    if (row.leaseExpiresAt !== null) {
      addIssue(
        context,
        ["leaseExpiresAt"],
        "Terminal idempotency rows must clear their lease.",
      );
    }
    if (row.completedAt === null) {
      addIssue(
        context,
        ["completedAt"],
        "Terminal idempotency rows require a completion time.",
      );
    }

    if (row.state === "SUCCEEDED") {
      if (row.safeResult === null) {
        addIssue(
          context,
          ["safeResult"],
          "Succeeded idempotency rows require a safe result.",
        );
      }
      if (row.safeErrorCode !== null) {
        addIssue(
          context,
          ["safeErrorCode"],
          "Succeeded idempotency rows cannot contain an error.",
        );
      }
      return;
    }

    if (row.safeErrorCode === null) {
      addIssue(
        context,
        ["safeErrorCode"],
        "Failed idempotency rows require a safe error code.",
      );
    }
    if (row.safeResult !== null) {
      addIssue(
        context,
        ["safeResult"],
        "Failed idempotency rows cannot contain a result.",
      );
    }
  });

/** Durable secret-safe idempotency persistence row. */
export type CompanyIdentityIdempotencyStoredRow = z.infer<
  typeof companyIdentityIdempotencyStoredRowSchema
>;
