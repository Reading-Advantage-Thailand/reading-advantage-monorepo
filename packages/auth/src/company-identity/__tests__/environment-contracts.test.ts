import { generateKeyPairSync } from "node:crypto";
import { describe, expect, it } from "vitest";

type RawEnvironment = Record<string, string | undefined>;
type ConfigFactory = (
  environment: RawEnvironment,
) => Readonly<Record<string, unknown>>;

interface CompanyIdentityAuthEnvironmentModule {
  createCompanyIdentitySecurityConfig: ConfigFactory;
  createCompanyIdentityIssuerConfig: ConfigFactory;
  createCompanyIdentityCookieConfig: ConfigFactory;
  createCompanyIdentityServiceAuthConfig: ConfigFactory;
  createCompanyIdentityPublicClientConfig: ConfigFactory;
}

const ENVIRONMENT_MODULE = "../environment.js";
const IDENTIFIER_HASH_KEY = Buffer.alloc(32, 7).toString("base64url");
const CLIENT_SECRET = "confidential-client-secret-value-32";
const { privateKey } = generateKeyPairSync("ed25519");
const SIGNING_PRIVATE_KEY = privateKey
  .export({ format: "pem", type: "pkcs8" })
  .toString();

const ISSUER_ENV = {
  NODE_ENV: "production",
  COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
  COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY: SIGNING_PRIVATE_KEY,
  COMPANY_AUTH_OIDC_SIGNING_KEY_ID: "company-signing-key-1",
  COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS: "300",
  COMPANY_AUTH_SSO_IDLE_TTL_SECONDS: "3600",
  COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS: "86400",
  COMPANY_AUTH_APP_SESSION_TTL_SECONDS: "3600",
  COMPANY_AUTH_CLOCK_SKEW_SECONDS: "30",
} as const;

const COOKIE_ENV = {
  NODE_ENV: "production",
  COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
  COMPANY_AUTH_COOKIE_NAME: "__Host-ra_company_sso",
  COMPANY_AUTH_COOKIE_SECURE: "true",
  COMPANY_AUTH_COOKIE_SAME_SITE: "lax",
  COMPANY_AUTH_COOKIE_PATH: "/",
} as const;

const SERVICE_ENV = {
  NODE_ENV: "production",
  COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
  COMPANY_AUTH_OIDC_CLIENT_ID: "marketing-server",
  COMPANY_AUTH_OIDC_CLIENT_SECRET: CLIENT_SECRET,
  COMPANY_AUTH_OIDC_REDIRECT_URI:
    "https://marketing.example.com/auth/company/callback",
  COMPANY_AUTH_EXPECTED_AUDIENCE: "marketing",
} as const;

const PUBLIC_CLIENT_ENV = {
  NODE_ENV: "production",
  COMPANY_AUTH_ISSUER_URL: "https://accounts.example.com",
  COMPANY_AUTH_OIDC_CLIENT_ID: "marketing-public",
  COMPANY_AUTH_OIDC_REDIRECT_URI:
    "https://marketing.example.com/auth/company/callback",
  COMPANY_AUTH_EXPECTED_AUDIENCE: "marketing",
} as const;

async function loadEnvironmentModule(): Promise<CompanyIdentityAuthEnvironmentModule> {
  let loaded: Record<string, unknown>;

  try {
    loaded = (await import(ENVIRONMENT_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "The auth-owned company-identity environment module is absent; " +
        "implement packages/auth/src/company-identity/environment.ts.",
      { cause: error },
    );
  }

  for (const exportName of [
    "createCompanyIdentitySecurityConfig",
    "createCompanyIdentityIssuerConfig",
    "createCompanyIdentityCookieConfig",
    "createCompanyIdentityServiceAuthConfig",
    "createCompanyIdentityPublicClientConfig",
  ]) {
    if (typeof loaded[exportName] !== "function") {
      throw new Error(
        `The auth-owned company-identity environment module is missing export ${exportName}.`,
      );
    }
  }

  return loaded as unknown as CompanyIdentityAuthEnvironmentModule;
}

function captureConfigError(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error(
    "Expected company-identity auth environment validation to fail.",
  );
}

function expectSecretSafeError(
  action: () => unknown,
  expectedRule: RegExp,
  secrets: readonly string[] = [],
): void {
  const message = captureConfigError(action);

  expect(message).toMatch(expectedRule);
  for (const secret of secrets) {
    expect(message).not.toContain(secret);
  }
}

function expectDeeplyFrozen(value: unknown): void {
  if (typeof value !== "object" || value === null) {
    return;
  }

  expect(Object.isFrozen(value)).toBe(true);
  for (const child of Object.values(value)) {
    expectDeeplyFrozen(child);
  }
}

describe("company identity auth environment contracts", () => {
  it("requires a distinct base64url identifier key of at least 32 decoded bytes", async () => {
    const environment = await loadEnvironmentModule();
    const config = environment.createCompanyIdentitySecurityConfig({
      COMPANY_AUTH_IDENTIFIER_HASH_KEY: IDENTIFIER_HASH_KEY,
    });

    expect(config).toHaveProperty("identifierHashKey");
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentitySecurityConfig({
          COMPANY_AUTH_IDENTIFIER_HASH_KEY: Buffer.alloc(31, 9).toString(
            "base64url",
          ),
        }),
      /COMPANY_AUTH_IDENTIFIER_HASH_KEY|32|base64url/i,
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentitySecurityConfig({
          COMPANY_AUTH_OIDC_CLIENT_SECRET: CLIENT_SECRET,
        }),
      /COMPANY_AUTH_IDENTIFIER_HASH_KEY|required|unrecognized/i,
      [CLIENT_SECRET],
    );
  });

  it("validates signing material and all issuer-session TTL relationships", async () => {
    const environment = await loadEnvironmentModule();
    const config = environment.createCompanyIdentityIssuerConfig(ISSUER_ENV);

    expect(config).toMatchObject({
      issuerUrl: ISSUER_ENV.COMPANY_AUTH_ISSUER_URL,
      signingKeyId: ISSUER_ENV.COMPANY_AUTH_OIDC_SIGNING_KEY_ID,
      authorizationCodeTtlSeconds: 300,
      ssoIdleTtlSeconds: 3600,
      ssoAbsoluteTtlSeconds: 86400,
      appSessionTtlSeconds: 3600,
      clockSkewSeconds: 30,
    });

    for (const invalidEnvironment of [
      { ...ISSUER_ENV, COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS: "59" },
      { ...ISSUER_ENV, COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS: "301" },
      { ...ISSUER_ENV, COMPANY_AUTH_SSO_IDLE_TTL_SECONDS: "299" },
      {
        ...ISSUER_ENV,
        COMPANY_AUTH_SSO_IDLE_TTL_SECONDS: "3600",
        COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS: "3600",
      },
      { ...ISSUER_ENV, COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS: "2592001" },
      {
        ...ISSUER_ENV,
        COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS: "7200",
        COMPANY_AUTH_APP_SESSION_TTL_SECONDS: "7201",
      },
      { ...ISSUER_ENV, COMPANY_AUTH_CLOCK_SKEW_SECONDS: "121" },
      { ...ISSUER_ENV, COMPANY_AUTH_OIDC_SIGNING_KEY_ID: "" },
    ]) {
      expectSecretSafeError(
        () => environment.createCompanyIdentityIssuerConfig(invalidEnvironment),
        /TTL|SECONDS|SIGNING_KEY_ID|idle|absolute|session|skew|60|300/i,
        [SIGNING_PRIVATE_KEY],
      );
    }
  });

  it("requires HTTPS in production and permits HTTP only on explicit loopback development ports", async () => {
    const environment = await loadEnvironmentModule();

    expect(
      environment.createCompanyIdentityIssuerConfig({
        ...ISSUER_ENV,
        NODE_ENV: "development",
        COMPANY_AUTH_ISSUER_URL: "http://localhost:3000",
      }),
    ).toHaveProperty("issuerUrl", "http://localhost:3000");

    for (const issuerUrl of [
      "http://accounts.example.com",
      "http://localhost",
      "https://user:ISSUER_PASSWORD@accounts.example.com",
      "https://accounts.example.com/",
      "https://accounts.example.com?tenant=other",
      "https://accounts.example.com#fragment",
      " https://accounts.example.com",
      "https://accounts.example.com ",
    ]) {
      expectSecretSafeError(
        () =>
          environment.createCompanyIdentityIssuerConfig({
            ...ISSUER_ENV,
            COMPANY_AUTH_ISSUER_URL: issuerUrl,
          }),
        /issuer|HTTPS|loopback|port|credentials|query|fragment|trailing/i,
        [issuerUrl, "ISSUER_PASSWORD", SIGNING_PRIVATE_KEY],
      );
    }
  });

  it("enforces host-only Secure HttpOnly SameSite=Lax production cookies", async () => {
    const environment = await loadEnvironmentModule();
    const config = environment.createCompanyIdentityCookieConfig(COOKIE_ENV);

    expect(config).toMatchObject({
      name: "__Host-ra_company_sso",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });
    expect(config).not.toHaveProperty("domain");

    for (const invalidEnvironment of [
      { ...COOKIE_ENV, COMPANY_AUTH_COOKIE_NAME: "ra_company_sso" },
      { ...COOKIE_ENV, COMPANY_AUTH_COOKIE_SECURE: "false" },
      { ...COOKIE_ENV, COMPANY_AUTH_COOKIE_SAME_SITE: "none" },
      { ...COOKIE_ENV, COMPANY_AUTH_COOKIE_PATH: "/auth" },
      { ...COOKIE_ENV, COMPANY_AUTH_COOKIE_DOMAIN: "example.com" },
      { ...COOKIE_ENV, COMPANY_AUTH_COOKIE_HTTP_ONLY: "false" },
    ]) {
      expectSecretSafeError(
        () => environment.createCompanyIdentityCookieConfig(invalidEnvironment),
        /cookie|__Host|Secure|SameSite|Path|Domain|HttpOnly|unrecognized/i,
      );
    }
  });

  it("allows an insecure development cookie only with a loopback HTTP issuer", async () => {
    const environment = await loadEnvironmentModule();
    const developmentCookie = {
      ...COOKIE_ENV,
      NODE_ENV: "development",
      COMPANY_AUTH_ISSUER_URL: "http://127.0.0.1:3000",
      COMPANY_AUTH_COOKIE_NAME: "ra_company_sso",
      COMPANY_AUTH_COOKIE_SECURE: "false",
    };

    expect(
      environment.createCompanyIdentityCookieConfig(developmentCookie),
    ).toMatchObject({ name: "ra_company_sso", secure: false, httpOnly: true });

    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityCookieConfig({
          ...developmentCookie,
          COMPANY_AUTH_ISSUER_URL: "http://accounts.example.com:3000",
        }),
      /loopback|issuer|cookie/i,
    );
  });

  it("separates confidential and public client contracts", async () => {
    const environment = await loadEnvironmentModule();

    expect(
      environment.createCompanyIdentityServiceAuthConfig(SERVICE_ENV),
    ).toMatchObject({
      clientId: "marketing-server",
      clientSecret: CLIENT_SECRET,
      redirectUri: SERVICE_ENV.COMPANY_AUTH_OIDC_REDIRECT_URI,
      expectedAudience: "marketing",
    });
    expect(
      environment.createCompanyIdentityPublicClientConfig(PUBLIC_CLIENT_ENV),
    ).toMatchObject({
      clientId: "marketing-public",
      redirectUri: PUBLIC_CLIENT_ENV.COMPANY_AUTH_OIDC_REDIRECT_URI,
      expectedAudience: "marketing",
    });

    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityServiceAuthConfig({
          ...SERVICE_ENV,
          COMPANY_AUTH_OIDC_CLIENT_SECRET: "too-short",
        }),
      /CLIENT_SECRET|32/i,
      ["too-short"],
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityPublicClientConfig({
          ...PUBLIC_CLIENT_ENV,
          COMPANY_AUTH_OIDC_CLIENT_SECRET: CLIENT_SECRET,
        }),
      /CLIENT_SECRET|unrecognized|public/i,
      [CLIENT_SECRET],
    );
  });

  it("requires exact absolute callbacks and stable application audiences", async () => {
    const environment = await loadEnvironmentModule();

    for (const invalidEnvironment of [
      {
        ...SERVICE_ENV,
        COMPANY_AUTH_OIDC_REDIRECT_URI:
          "https://*.example.com/auth/company/callback",
      },
      {
        ...SERVICE_ENV,
        COMPANY_AUTH_OIDC_REDIRECT_URI:
          "https://marketing.example.com/auth/company/callback#fragment",
      },
      {
        ...SERVICE_ENV,
        COMPANY_AUTH_OIDC_REDIRECT_URI:
          " https://marketing.example.com/auth/company/callback",
      },
      { ...SERVICE_ENV, COMPANY_AUTH_EXPECTED_AUDIENCE: "Marketing" },
      { ...SERVICE_ENV, COMPANY_AUTH_EXPECTED_AUDIENCE: "sales/admin" },
    ]) {
      expectSecretSafeError(
        () =>
          environment.createCompanyIdentityServiceAuthConfig(
            invalidEnvironment,
          ),
        /redirect|callback|audience|stable|wildcard|fragment/i,
        [CLIENT_SECRET],
      );
    }
  });

  it("rejects unknown keys in every auth-owned parser", async () => {
    const environment = await loadEnvironmentModule();
    const cases: readonly [ConfigFactory, RawEnvironment][] = [
      [
        environment.createCompanyIdentitySecurityConfig,
        {
          COMPANY_AUTH_IDENTIFIER_HASH_KEY: IDENTIFIER_HASH_KEY,
        },
      ],
      [environment.createCompanyIdentityIssuerConfig, ISSUER_ENV],
      [environment.createCompanyIdentityCookieConfig, COOKIE_ENV],
      [environment.createCompanyIdentityServiceAuthConfig, SERVICE_ENV],
      [environment.createCompanyIdentityPublicClientConfig, PUBLIC_CLIENT_ENV],
    ];

    for (const [factory, validEnvironment] of cases) {
      expectSecretSafeError(
        () => factory({ ...validEnvironment, COMPANY_AUTH_UNREVIEWED: "true" }),
        /unrecognized|unknown|COMPANY_AUTH_UNREVIEWED/i,
        [SIGNING_PRIVATE_KEY, CLIENT_SECRET, IDENTIFIER_HASH_KEY],
      );
    }
  });

  it("returns deeply frozen auth configuration objects", async () => {
    const environment = await loadEnvironmentModule();
    const configs = [
      environment.createCompanyIdentitySecurityConfig({
        COMPANY_AUTH_IDENTIFIER_HASH_KEY: IDENTIFIER_HASH_KEY,
      }),
      environment.createCompanyIdentityIssuerConfig(ISSUER_ENV),
      environment.createCompanyIdentityCookieConfig(COOKIE_ENV),
      environment.createCompanyIdentityServiceAuthConfig(SERVICE_ENV),
      environment.createCompanyIdentityPublicClientConfig(PUBLIC_CLIENT_ENV),
    ];

    for (const config of configs) {
      expectDeeplyFrozen(config);
      expect(Reflect.set(config as object, "unexpected", true)).toBe(false);
    }
  });
});
