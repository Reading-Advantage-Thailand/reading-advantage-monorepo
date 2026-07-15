import { beforeAll, describe, expect, it } from "vitest";

type IssuePath = Array<string | number>;

interface ContractIssue {
  code: string;
  keys?: string[];
  path: IssuePath;
}

interface ContractParseFailure {
  error: {
    issues: ContractIssue[];
  };
  success: false;
}

interface ContractParseSuccess<T = unknown> {
  data: T;
  success: true;
}

interface ContractSchema<T = unknown> {
  parse(value: unknown): T;
  safeParse(value: unknown): ContractParseFailure | ContractParseSuccess<T>;
}

interface LoadedSurface {
  error: Error | null;
  exports: Record<string, unknown> | null;
  label: string;
}

interface AccountRow {
  authVersion: number;
  createdAt: Date;
  displayName: string;
  id: string;
  normalizationVersion: 1;
  normalizedUsername: string;
  status: "ACTIVE" | "SUSPENDED";
  statusChangedAt: Date;
  updatedAt: Date;
  username: string;
}

const ACCOUNT_ID = "10000000-0000-4000-8000-000000000001";
const APPLICATION_ID = "30000000-0000-4000-8000-000000000001";
const OIDC_CLIENT_ID = "40000000-0000-4000-8000-000000000001";
const REDIRECT_URI_ID = "50000000-0000-4000-8000-000000000001";
const SSO_SESSION_ID = "60000000-0000-4000-8000-000000000001";
const MIGRATION_RUN_ID = "80000000-0000-4000-8000-000000000001";
const RECORD_ID = "90000000-0000-4000-8000-000000000001";
const LOWER_HEX_64 = "a".repeat(64);
const OTHER_LOWER_HEX_64 = "b".repeat(64);
const THIRD_LOWER_HEX_64 = "c".repeat(64);
const PKCE_S256_CHALLENGE = "A".repeat(43);
const ARGON2ID_HASH =
  "$argon2id$v=19$m=65536,t=3,p=4$YWJjZGVmZ2hpamtsbW5vcA$" +
  "YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXo";
const BCRYPT_HASH =
  "$2b$12$abcdefghijklmnopqrstuuABCDEFGHIJKLMNOPQRSTUVWXYZ01234";
const ISSUED_AT = new Date("2026-07-15T12:00:00.000Z");
const EXPIRES_AT = new Date("2026-07-15T12:05:00.000Z");

let contractsSurface: LoadedSurface;
let normalizationSurface: LoadedSurface;

async function loadSurface(
  label: string,
  relativeModulePath: string,
): Promise<LoadedSurface> {
  const moduleUrl = new URL(relativeModulePath, import.meta.url).href;

  try {
    const loaded = (await import(/* @vite-ignore */ moduleUrl)) as Record<
      string,
      unknown
    >;
    return { error: null, exports: loaded, label };
  } catch (error) {
    return {
      error: error instanceof Error ? error : new Error(String(error)),
      exports: null,
      label,
    };
  }
}

function requireExport<T>(surface: LoadedSurface, exportName: string): T {
  expect(
    surface.error,
    `Expected the DB-owned ${surface.label} module and export ` +
      `"${exportName}" to exist. This is the intentional Task 3 Red ` +
      `surface; production contracts arrive in Task 5. Import error: ` +
      `${surface.error?.message ?? "none"}`,
  ).toBeNull();

  expect(
    surface.exports,
    `Expected the DB-owned ${surface.label} module to expose contracts.`,
  ).not.toBeNull();

  if (surface.exports === null) {
    throw new Error(`The ${surface.label} contract surface is unavailable.`);
  }

  expect(
    surface.exports[exportName],
    `Expected the DB-owned ${surface.label} export "${exportName}".`,
  ).toBeDefined();

  return surface.exports[exportName] as T;
}

function schema<T = unknown>(exportName: string): ContractSchema<T> {
  return requireExport<ContractSchema<T>>(contractsSurface, exportName);
}

function expectInvalidAt(
  contractSchema: ContractSchema,
  value: unknown,
  expectedPath: IssuePath,
  caseLabel: string,
): void {
  const result = contractSchema.safeParse(value);

  expect(result.success, `${caseLabel} must be rejected.`).toBe(false);
  if (result.success) {
    return;
  }

  expect(
    result.error.issues.map((issue) => issue.path),
    `${caseLabel} must report the issue at ${JSON.stringify(expectedPath)}.`,
  ).toContainEqual(expectedPath);
}

function expectUnknownKeyRejected(
  contractSchema: ContractSchema,
  value: object,
  unknownKey: string,
  caseLabel: string,
): void {
  const result = contractSchema.safeParse({
    ...value,
    [unknownKey]: "must-not-be-accepted",
  });

  expect(result.success, `${caseLabel} must reject unknown keys.`).toBe(false);
  if (result.success) {
    return;
  }

  expect(
    result.error.issues.some(
      (issue) =>
        issue.code === "unrecognized_keys" &&
        issue.path.length === 0 &&
        issue.keys?.includes(unknownKey) === true,
    ),
    `${caseLabel} must report "${unknownKey}" as an unrecognized root key.`,
  ).toBe(true);
}

function validAccountRow(): AccountRow {
  return {
    authVersion: 1,
    createdAt: new Date("2026-07-15T10:00:00.000Z"),
    displayName: "Alice Example",
    id: ACCOUNT_ID,
    normalizationVersion: 1,
    normalizedUsername: "alice.example",
    status: "ACTIVE",
    statusChangedAt: new Date("2026-07-15T10:00:00.000Z"),
    updatedAt: new Date("2026-07-15T10:00:00.000Z"),
    username: "Alice.Example",
  };
}

function validCredentialRow(): Record<string, unknown> {
  return {
    accountId: ACCOUNT_ID,
    algorithm: "ARGON2ID",
    createdAt: new Date("2026-07-15T10:00:00.000Z"),
    credentialVersion: 1,
    lastVerifiedAt: null,
    legacyImportedAt: null,
    passwordHash: ARGON2ID_HASH,
    updatedAt: new Date("2026-07-15T10:00:00.000Z"),
  };
}

function validOidcClientRow(): Record<string, unknown> {
  return {
    applicationId: APPLICATION_ID,
    clientId: "marketing-server",
    clientSecretHash: null,
    clientType: "PUBLIC",
    createdAt: new Date("2026-07-15T10:00:00.000Z"),
    id: OIDC_CLIENT_ID,
    pkceRequired: true,
    secretVersion: 1,
    status: "ACTIVE",
    tokenAuthMethod: "NONE",
    updatedAt: new Date("2026-07-15T10:00:00.000Z"),
  };
}

function validRedirectUriRow(): Record<string, unknown> {
  return {
    createdAt: new Date("2026-07-15T10:00:00.000Z"),
    id: REDIRECT_URI_ID,
    oidcClientId: OIDC_CLIENT_ID,
    redirectUri: "https://marketing.example.com/auth/callback",
  };
}

function validAuthorizationCodeRow(): Record<string, unknown> {
  return {
    codeChallenge: PKCE_S256_CHALLENGE,
    codeChallengeMethod: "S256",
    codeHash: LOWER_HEX_64,
    consumedAt: null,
    expiresAt: new Date(EXPIRES_AT),
    id: RECORD_ID,
    issuedAt: new Date(ISSUED_AT),
    nonce: "nonce-123",
    oidcClientId: OIDC_CLIENT_ID,
    redirectUriId: REDIRECT_URI_ID,
    revokedAt: null,
    scope: ["openid"],
    ssoSessionId: SSO_SESSION_ID,
  };
}

function validAuditMetadata(): Record<string, unknown> {
  return {
    clientId: "marketing-server",
    credentialAlgorithm: "ARGON2ID",
    expiresAt: "2026-07-15T12:05:00.000Z",
    idempotencyReplay: false,
    migrationRunId: MIGRATION_RUN_ID,
    newStatus: "SUSPENDED",
    normalizationVersion: 1,
    previousStatus: "ACTIVE",
    reasonCategory: "administrator-action",
    roleKey: "EMPLOYEE",
    sessionCount: 3,
    source: "accounts",
    sourceFingerprint: LOWER_HEX_64,
    sourcePrincipalId: "codecamp-user-42",
  };
}

function validIdempotencyRow(): Record<string, unknown> {
  return {
    completedAt: null,
    createdAt: new Date("2026-07-15T10:00:00.000Z"),
    expiresAt: new Date("2026-07-16T10:00:00.000Z"),
    id: RECORD_ID,
    idempotencyKeyHash: LOWER_HEX_64,
    leaseExpiresAt: new Date("2026-07-15T10:05:00.000Z"),
    operation: "account:create",
    ownerTokenHash: THIRD_LOWER_HEX_64,
    requestHash: OTHER_LOWER_HEX_64,
    safeErrorCode: null,
    safeResult: null,
    scopeKey: "organization:20000000-0000-4000-8000-000000000001",
    state: "IN_PROGRESS",
  };
}

beforeAll(async () => {
  [contractsSurface, normalizationSurface] = await Promise.all([
    loadSurface("company-identity contracts", "../contracts/index.ts"),
    loadSurface("company-identity normalization", "../normalization.ts"),
  ]);
});

describe("company identity contract Red surface", () => {
  it("loads the dedicated DB contract and normalization modules", () => {
    expect(
      contractsSurface.error,
      `Expected packages/db/src/company-identity/contracts/index.ts. ` +
        `Task 3 is Red until Task 5 supplies it. Import error: ` +
        `${contractsSurface.error?.message ?? "none"}`,
    ).toBeNull();
    expect(
      normalizationSurface.error,
      `Expected packages/db/src/company-identity/normalization.ts. ` +
        `Task 3 is Red until Task 5 supplies it. Import error: ` +
        `${normalizationSurface.error?.message ?? "none"}`,
    ).toBeNull();
  });
});

describe("deterministic username normalization Version 1", () => {
  const fixedVectors = [
    { expected: "a", input: "a", label: "single character" },
    { expected: "alice", input: " Alice ", label: "trim and lowercase" },
    {
      expected: "alice",
      input: " \uFF21lice ",
      label: "NFKC full-width folding",
    },
    {
      expected: "user.name-1",
      input: "User.Name-1",
      label: "internal separators",
    },
    {
      expected: "user_name",
      input: "USER_NAME",
      label: "underscore and ASCII case",
    },
  ];

  const collisionVectors = [
    { left: "Alice", normalized: "alice", right: " alice " },
    { left: "\uFF21LICE", normalized: "alice", right: "alice" },
    { left: "User.Name", normalized: "user.name", right: "USER.NAME" },
  ];

  const invalidInputs = [
    { input: "", label: "empty" },
    { input: "   ", label: "whitespace-only" },
    { input: ".alice", label: "leading period" },
    { input: "alice_", label: "trailing underscore" },
    { input: "ali ce", label: "internal whitespace" },
    { input: "al\u0000ice", label: "NUL" },
    { input: "al\nice", label: "ASCII control" },
    { input: "jos\u00E9", label: "non-ASCII after NFKC" },
    { input: "a".repeat(65), label: "over 64 characters" },
  ];

  it("pins the normalization provenance version to literal 1", () => {
    expect(
      requireExport<number>(
        normalizationSurface,
        "COMPANY_USERNAME_NORMALIZATION_VERSION",
      ),
    ).toBe(1);
    expect(
      schema<number>("companyUsernameNormalizationVersionSchema").parse(1),
    ).toBe(1);
    expectInvalidAt(
      schema("companyUsernameNormalizationVersionSchema"),
      2,
      [],
      "normalization version 2 before a reviewed migration",
    );
  });

  it.each(fixedVectors)(
    "normalizes $label deterministically",
    ({ expected, input }) => {
      const normalizeV1 = requireExport<(value: string) => string>(
        normalizationSurface,
        "normalizeCompanyUsernameV1",
      );
      const normalizeCurrent = requireExport<(value: string) => string>(
        normalizationSurface,
        "normalizeCompanyUsername",
      );

      expect(normalizeV1(input)).toBe(expected);
      expect(normalizeCurrent(input)).toBe(expected);
    },
  );

  it.each(collisionVectors)(
    "maps the fixed collision pair $left and $right to $normalized",
    ({ left, normalized, right }) => {
      const normalize = requireExport<(value: string) => string>(
        normalizationSurface,
        "normalizeCompanyUsername",
      );

      expect(normalize(left)).toBe(normalized);
      expect(normalize(right)).toBe(normalized);
    },
  );

  it.each(invalidInputs)("rejects $label usernames", ({ input }) => {
    const normalize = requireExport<(value: string) => string>(
      normalizationSurface,
      "normalizeCompanyUsernameV1",
    );

    expect(() => normalize(input)).toThrow();
    expectInvalidAt(
      schema("companyUsernameInputSchema"),
      input,
      [],
      `username input ${JSON.stringify(input)}`,
    );
  });

  it("keeps the account spelling NFKC-normalized and trimmed while equality is normalized", () => {
    expect(
      schema<string>("companyUsernameInputSchema").parse(" \uFF21lice "),
    ).toBe("Alice");
    expect(
      schema<string>("normalizedCompanyUsernameSchema").parse("alice"),
    ).toBe("alice");
    expectInvalidAt(
      schema("normalizedCompanyUsernameSchema"),
      "Alice",
      [],
      "a non-normalized comparison username",
    );
  });
});

describe("account, credential, and named-role persistence contracts", () => {
  it.each(["ACTIVE", "SUSPENDED"])("accepts account status %s", (status) => {
    expect(schema("companyAccountStatusSchema").parse(status)).toBe(status);
  });

  it.each(["DISABLED", "DELETED", "PENDING", "active", ""])(
    "rejects account status %s",
    (status) => {
      expectInvalidAt(
        schema("companyAccountStatusSchema"),
        status,
        [],
        `unknown account status ${JSON.stringify(status)}`,
      );
    },
  );

  it("accepts the exact public-safe stored account shape", () => {
    expect(
      schema<AccountRow>("companyAccountStoredRowSchema").parse(
        validAccountRow(),
      ),
    ).toEqual(validAccountRow());
  });

  it.each([
    {
      path: ["id"],
      patch: { id: "not-a-uuid" },
      reason: "non-UUID account ID",
    },
    {
      path: ["normalizedUsername"],
      patch: { normalizedUsername: "Alice.Example" },
      reason: "non-normalized stored username",
    },
    {
      path: ["normalizationVersion"],
      patch: { normalizationVersion: 2 },
      reason: "unsupported normalization provenance",
    },
    {
      path: ["authVersion"],
      patch: { authVersion: 0 },
      reason: "zero auth version",
    },
  ])("rejects $reason", ({ patch, path, reason }) => {
    expectInvalidAt(
      schema("companyAccountStoredRowSchema"),
      { ...validAccountRow(), ...patch },
      path,
      reason,
    );
  });

  it("rejects credential material on the public-safe account row", () => {
    expectUnknownKeyRejected(
      schema("companyAccountStoredRowSchema"),
      validAccountRow(),
      "passwordHash",
      "companyAccountStoredRowSchema",
    );
  });

  it.each(["ARGON2ID", "BCRYPT"])(
    "accepts password algorithm %s",
    (algorithm) => {
      expect(schema("passwordHashAlgorithmSchema").parse(algorithm)).toBe(
        algorithm,
      );
    },
  );

  it.each(["ARGON2", "SCRYPT", "bcrypt", ""])(
    "rejects password algorithm %s",
    (algorithm) => {
      expectInvalidAt(
        schema("passwordHashAlgorithmSchema"),
        algorithm,
        [],
        `unknown password algorithm ${JSON.stringify(algorithm)}`,
      );
    },
  );

  it("accepts matching Argon2id and migrated bcrypt credential rows", () => {
    const credentialSchema = schema("companyPasswordCredentialStoredRowSchema");
    expect(credentialSchema.safeParse(validCredentialRow()).success).toBe(true);
    expect(
      credentialSchema.safeParse({
        ...validCredentialRow(),
        algorithm: "BCRYPT",
        legacyImportedAt: new Date("2026-07-15T10:00:00.000Z"),
        passwordHash: BCRYPT_HASH,
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      patch: { algorithm: "ARGON2ID", passwordHash: BCRYPT_HASH },
      path: ["passwordHash"],
      reason: "bcrypt prefix under ARGON2ID",
    },
    {
      patch: { algorithm: "BCRYPT", passwordHash: ARGON2ID_HASH },
      path: ["passwordHash"],
      reason: "Argon2id prefix under BCRYPT",
    },
    {
      patch: { credentialVersion: 0 },
      path: ["credentialVersion"],
      reason: "zero credential version",
    },
  ])("rejects $reason", ({ patch, path, reason }) => {
    expectInvalidAt(
      schema("companyPasswordCredentialStoredRowSchema"),
      { ...validCredentialRow(), ...patch },
      path,
      reason,
    );
  });

  it.each(["EMPLOYEE", "COMPANY_ADMIN"])("accepts company role %s", (role) => {
    expect(schema("companyRoleKeySchema").parse(role)).toBe(role);
  });

  it.each(["ADMIN", "SALES_ADMIN", "SUPERADMIN", "employee", ""])(
    "rejects non-company role %s",
    (role) => {
      expectInvalidAt(
        schema("companyRoleKeySchema"),
        role,
        [],
        `unknown company role ${JSON.stringify(role)}`,
      );
    },
  );

  it.each(["MEMBER", "ADMIN", "SALES_REP", "SALES_ADMIN", "R2_ADMIN"])(
    "accepts grammar-valid application role %s",
    (role) => {
      expect(schema("applicationRoleKeySchema").parse(role)).toBe(role);
    },
  );

  it.each(["member", "2ADMIN", "SALES-ADMIN", "_ADMIN", "A".repeat(65), ""])(
    "rejects malformed application role %s",
    (role) => {
      expectInvalidAt(
        schema("applicationRoleKeySchema"),
        role,
        [],
        `malformed application role ${JSON.stringify(role)}`,
      );
    },
  );
});

describe("organization, application, and hash key formats", () => {
  it("accepts only the internal-company organization type", () => {
    expect(
      schema("companyOrganizationTypeSchema").parse("INTERNAL_COMPANY"),
    ).toBe("INTERNAL_COMPANY");
  });

  it.each(["SCHOOL", "CUSTOMER", "CUSTOMER_COMPANY", "B2B", ""])(
    "rejects out-of-scope organization type %s",
    (organizationType) => {
      expectInvalidAt(
        schema("companyOrganizationTypeSchema"),
        organizationType,
        [],
        `out-of-scope organization type ${JSON.stringify(organizationType)}`,
      );
    },
  );

  it.each(["a", "internal-company", "marketing", "sales-2"])(
    "accepts organization/application stable key %s",
    (stableKey) => {
      expect(schema("organizationStableKeySchema").parse(stableKey)).toBe(
        stableKey,
      );
      expect(schema("applicationStableKeySchema").parse(stableKey)).toBe(
        stableKey,
      );
    },
  );

  it.each([
    "Internal-Company",
    "-sales",
    "sales-",
    "sales_app",
    "a".repeat(65),
    "",
  ])("rejects malformed stable key %s", (stableKey) => {
    expectInvalidAt(
      schema("organizationStableKeySchema"),
      stableKey,
      [],
      `malformed organization key ${JSON.stringify(stableKey)}`,
    );
    expectInvalidAt(
      schema("applicationStableKeySchema"),
      stableKey,
      [],
      `malformed application key ${JSON.stringify(stableKey)}`,
    );
  });

  it.each([LOWER_HEX_64, OTHER_LOWER_HEX_64, THIRD_LOWER_HEX_64])(
    "accepts a lowercase SHA-256/HMAC digest",
    (digest) => {
      expect(schema("sha256HexSchema").parse(digest)).toBe(digest);
    },
  );

  it.each([
    "A".repeat(64),
    "g".repeat(64),
    "a".repeat(63),
    "a".repeat(65),
    ` ${LOWER_HEX_64}`,
    "",
  ])("rejects malformed SHA-256/HMAC digest %s", (digest) => {
    expectInvalidAt(
      schema("sha256HexSchema"),
      digest,
      [],
      "a digest that is not exactly 64 lowercase hexadecimal characters",
    );
  });

  it.each(["account:create", "session:revoke", "migration:codecamp:import"])(
    "accepts audit operation key %s",
    (operation) => {
      expect(schema("auditOperationKeySchema").parse(operation)).toBe(
        operation,
      );
    },
  );

  it.each([
    "Account:Create",
    ":create",
    "account:",
    "account create",
    "a".repeat(129),
    "",
  ])("rejects malformed audit operation key %s", (operation) => {
    expectInvalidAt(
      schema("auditOperationKeySchema"),
      operation,
      [],
      `malformed audit operation ${JSON.stringify(operation)}`,
    );
  });
});

describe("stored OIDC client, redirect, PKCE, and authorization-code contracts", () => {
  it("accepts exact PUBLIC and CONFIDENTIAL client configurations", () => {
    const clientSchema = schema("companyOidcClientStoredRowSchema");
    expect(clientSchema.safeParse(validOidcClientRow()).success).toBe(true);
    expect(
      clientSchema.safeParse({
        ...validOidcClientRow(),
        clientSecretHash: ARGON2ID_HASH,
        clientType: "CONFIDENTIAL",
        tokenAuthMethod: "CLIENT_SECRET_BASIC",
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      patch: { clientSecretHash: ARGON2ID_HASH },
      path: ["clientSecretHash"],
      reason: "PUBLIC client with a secret",
    },
    {
      patch: { clientType: "CONFIDENTIAL", tokenAuthMethod: "NONE" },
      path: ["tokenAuthMethod"],
      reason: "CONFIDENTIAL client without basic authentication",
    },
    {
      patch: {
        clientSecretHash: ARGON2ID_HASH,
        clientType: "CONFIDENTIAL",
        tokenAuthMethod: "CLIENT_SECRET_BASIC",
        pkceRequired: false,
      },
      path: ["pkceRequired"],
      reason: "client with PKCE disabled",
    },
    {
      patch: { secretVersion: 0 },
      path: ["secretVersion"],
      reason: "zero secret version",
    },
  ])("rejects $reason", ({ patch, path, reason }) => {
    expectInvalidAt(
      schema("companyOidcClientStoredRowSchema"),
      { ...validOidcClientRow(), ...patch },
      path,
      reason,
    );
  });

  it.each([
    "https://marketing.example.com/auth/callback",
    "https://marketing.example.com/auth/callback?flow=employee",
    "http://localhost:3000/auth/callback",
    "http://127.0.0.1:3000/auth/callback",
    "http://[::1]:3000/auth/callback",
  ])("accepts exact safe redirect URI %s", (redirectUri) => {
    expect(
      schema("companyOidcRedirectUriStoredRowSchema").safeParse({
        ...validRedirectUriRow(),
        redirectUri,
      }).success,
    ).toBe(true);
  });

  it.each([
    "marketing.example.com/callback",
    "/auth/callback",
    "ftp://marketing.example.com/callback",
    "https://user:password@marketing.example.com/callback",
    "https://marketing.example.com/callback#fragment",
    "https://*.example.com/callback",
    "https://marketing.example.com/*",
    "http://marketing.example.com/callback",
    "http://localhost/callback",
    " https://marketing.example.com/callback",
    "https://marketing.example.com/callback ",
  ])("rejects unsafe redirect URI %s", (redirectUri) => {
    expectInvalidAt(
      schema("companyOidcRedirectUriStoredRowSchema"),
      { ...validRedirectUriRow(), redirectUri },
      ["redirectUri"],
      `unsafe redirect URI ${JSON.stringify(redirectUri)}`,
    );
  });

  it("accepts an unconsumed S256 code with a five-minute exclusive lifetime", () => {
    expect(
      schema("companyOidcAuthorizationCodeStoredRowSchema").parse(
        validAuthorizationCodeRow(),
      ),
    ).toEqual(validAuthorizationCodeRow());
  });

  it.each([
    {
      patch: { codeHash: "A".repeat(64) },
      path: ["codeHash"],
      reason: "uppercase code hash",
    },
    {
      patch: { codeChallenge: `${PKCE_S256_CHALLENGE}=` },
      path: ["codeChallenge"],
      reason: "padded PKCE challenge",
    },
    {
      patch: { codeChallenge: "A".repeat(42) },
      path: ["codeChallenge"],
      reason: "short PKCE challenge",
    },
    {
      patch: { codeChallengeMethod: "PLAIN" },
      path: ["codeChallengeMethod"],
      reason: "plain PKCE method",
    },
    {
      patch: { expiresAt: undefined },
      path: ["expiresAt"],
      reason: "authorization code without an expiry",
    },
    {
      patch: { expiresAt: new Date(ISSUED_AT) },
      path: ["expiresAt"],
      reason: "zero-length code lifetime",
    },
    {
      patch: { expiresAt: new Date("2026-07-15T12:05:00.001Z") },
      path: ["expiresAt"],
      reason: "code lifetime over five minutes",
    },
    {
      patch: {
        consumedAt: new Date("2026-07-15T12:01:00.000Z"),
        revokedAt: new Date("2026-07-15T12:02:00.000Z"),
      },
      path: ["consumedAt"],
      reason: "both consumed and revoked terminal states",
    },
    {
      patch: { consumedAt: new Date("2026-07-15T11:59:59.999Z") },
      path: ["consumedAt"],
      reason: "consumption before issue",
    },
    {
      patch: { consumedAt: new Date(EXPIRES_AT) },
      path: ["consumedAt"],
      reason: "consumption at exclusive expiry",
    },
    { patch: { nonce: "" }, path: ["nonce"], reason: "empty nonce" },
    { patch: { scope: [] }, path: ["scope"], reason: "scope without openid" },
  ])("rejects $reason", ({ patch, path, reason }) => {
    expectInvalidAt(
      schema("companyOidcAuthorizationCodeStoredRowSchema"),
      { ...validAuthorizationCodeRow(), ...patch },
      path,
      reason,
    );
  });
});

describe("strict allowlisted audit metadata", () => {
  it("accepts the complete reviewed global DB metadata allowlist", () => {
    expect(schema("auditMetadataSchema").parse(validAuditMetadata())).toEqual(
      validAuditMetadata(),
    );
  });

  it.each([
    "password",
    "passwordHash",
    "PASSWORD_HASH",
    "sessionToken",
    "authorizationCode",
    "pkceVerifier",
    "pkceChallenge",
    "nonce",
    "clientSecret",
    "cookieValue",
    "connectionString",
    "idempotencyKey",
    "email",
    "rawIpAddress",
  ])("rejects compound or mixed-case secret key %s", (secretKey) => {
    expectUnknownKeyRejected(
      schema("auditMetadataSchema"),
      {},
      secretKey,
      "auditMetadataSchema",
    );
  });

  it.each([
    {
      label: "nested password object through an allowed source key",
      path: ["source"],
      value: { source: { password: "secret" } },
    },
    {
      label: "nested token array through an allowed source key",
      path: ["source"],
      value: { source: ["accounts", { sessionToken: "secret" }] },
    },
    {
      label: "nested secret object through an unknown details key",
      path: [],
      value: { details: { authorizationCode: "secret" } },
    },
    {
      label: "array instead of metadata object",
      path: [],
      value: [{ source: "accounts" }, { passwordHash: "secret" }],
    },
  ])("rejects $label", ({ label, path, value }) => {
    expectInvalidAt(schema("auditMetadataSchema"), value, path, label);
  });
});

describe("strict idempotency persistence contract", () => {
  it("accepts correctly formatted in-progress, succeeded, and failed records", () => {
    const idempotencySchema = schema(
      "companyIdentityIdempotencyStoredRowSchema",
    );
    expect(idempotencySchema.safeParse(validIdempotencyRow()).success).toBe(
      true,
    );
    expect(
      idempotencySchema.safeParse({
        ...validIdempotencyRow(),
        completedAt: new Date("2026-07-15T10:01:00.000Z"),
        leaseExpiresAt: null,
        ownerTokenHash: null,
        safeResult: { accountId: ACCOUNT_ID },
        state: "SUCCEEDED",
      }).success,
    ).toBe(true);
    expect(
      idempotencySchema.safeParse({
        ...validIdempotencyRow(),
        completedAt: new Date("2026-07-15T10:01:00.000Z"),
        leaseExpiresAt: null,
        ownerTokenHash: null,
        safeErrorCode: "USERNAME_COLLISION",
        state: "FAILED",
      }).success,
    ).toBe(true);
  });

  it.each([
    {
      patch: { idempotencyKeyHash: "A".repeat(64) },
      path: ["idempotencyKeyHash"],
      reason: "uppercase caller-key HMAC",
    },
    {
      patch: { requestHash: "b".repeat(63) },
      path: ["requestHash"],
      reason: "short request HMAC",
    },
    {
      patch: { ownerTokenHash: null },
      path: ["ownerTokenHash"],
      reason: "in-progress row without an owner hash",
    },
    {
      patch: { leaseExpiresAt: null },
      path: ["leaseExpiresAt"],
      reason: "in-progress row without a lease",
    },
    {
      patch: { completedAt: new Date("2026-07-15T10:01:00.000Z") },
      path: ["completedAt"],
      reason: "in-progress row marked complete",
    },
    {
      patch: { expiresAt: undefined },
      path: ["expiresAt"],
      reason: "idempotency row without a retention expiry",
    },
    {
      patch: { expiresAt: new Date("2026-07-15T10:00:00.000Z") },
      path: ["expiresAt"],
      reason: "non-future retention expiry",
    },
    {
      patch: { scopeKey: "school:20000000-0000-4000-8000-000000000001" },
      path: ["scopeKey"],
      reason: "school scope in company identity",
    },
    {
      patch: { scopeKey: "ORGANIZATION:20000000-0000-4000-8000-000000000001" },
      path: ["scopeKey"],
      reason: "uppercase idempotency scope",
    },
  ])("rejects $reason", ({ patch, path, reason }) => {
    expectInvalidAt(
      schema("companyIdentityIdempotencyStoredRowSchema"),
      { ...validIdempotencyRow(), ...patch },
      path,
      reason,
    );
  });
});

describe("strict unknown-key rejection across every stored object schema", () => {
  it.each([
    {
      exportName: "companyAccountStoredRowSchema",
      label: "account row",
      value: validAccountRow(),
    },
    {
      exportName: "companyPasswordCredentialStoredRowSchema",
      label: "password credential row",
      value: validCredentialRow(),
    },
    {
      exportName: "companyOidcClientStoredRowSchema",
      label: "OIDC client row",
      value: validOidcClientRow(),
    },
    {
      exportName: "companyOidcRedirectUriStoredRowSchema",
      label: "OIDC redirect URI row",
      value: validRedirectUriRow(),
    },
    {
      exportName: "companyOidcAuthorizationCodeStoredRowSchema",
      label: "OIDC authorization code row",
      value: validAuthorizationCodeRow(),
    },
    {
      exportName: "companyIdentityIdempotencyStoredRowSchema",
      label: "idempotency row",
      value: validIdempotencyRow(),
    },
  ])("rejects an unknown field on $label", ({ exportName, label, value }) => {
    expectUnknownKeyRejected(
      schema(exportName),
      value,
      "unexpectedField",
      label,
    );
  });
});
