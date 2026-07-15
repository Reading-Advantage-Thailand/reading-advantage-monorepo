import { describe, expect, it } from "vitest";

type RawEnvironment = Record<string, string | undefined>;

interface CompanyIdentityRuntimeConfig {
  readonly databaseUrl: string;
  readonly nodeEnv: "development" | "test" | "production";
  readonly poolMax: number;
}

interface CompanyIdentityDirectConfig {
  readonly directDatabaseUrl: string;
}

interface CompanyIdentityTestConfig {
  readonly adminDatabaseUrl: string;
}

interface CompanyIdentityEnvironmentModule {
  createCompanyIdentityRuntimeConfig(
    environment: RawEnvironment
  ): CompanyIdentityRuntimeConfig;
  createCompanyIdentityDirectConfig(
    environment: RawEnvironment
  ): CompanyIdentityDirectConfig;
  createCompanyIdentityTestConfig(
    environment: RawEnvironment
  ): CompanyIdentityTestConfig;
}

const ENVIRONMENT_MODULE = "../environment.js";
const RUNTIME_URL =
  "postgresql://company_runtime:runtime-secret@127.0.0.1:6432/company_identity";
const DIRECT_URL =
  "postgresql://company_migrator:direct-secret@127.0.0.1:5432/company_identity";
const TEST_ADMIN_URL =
  "postgresql://postgres:test-admin-secret@127.0.0.1:5432/postgres";

async function loadEnvironmentModule(): Promise<CompanyIdentityEnvironmentModule> {
  let loaded: Record<string, unknown>;

  try {
    loaded = (await import(ENVIRONMENT_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "The dedicated company-identity environment module is absent; " +
        "implement src/company-identity/environment.ts with the three DB-owned config factories.",
      { cause: error }
    );
  }

  for (const exportName of [
    "createCompanyIdentityRuntimeConfig",
    "createCompanyIdentityDirectConfig",
    "createCompanyIdentityTestConfig",
  ]) {
    if (typeof loaded[exportName] !== "function") {
      throw new Error(
        `The dedicated company-identity environment module is missing export ${exportName}.`
      );
    }
  }

  return loaded as unknown as CompanyIdentityEnvironmentModule;
}

function captureConfigError(action: () => unknown): string {
  try {
    action();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }

  throw new Error("Expected company-identity environment validation to fail.");
}

function expectSecretSafeError(
  action: () => unknown,
  expectedRule: RegExp,
  secrets: readonly string[]
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

describe("company identity DB environment contracts", () => {
  it("parses distinct pooled, direct, and test-admin URL roles", async () => {
    const environment = await loadEnvironmentModule();

    expect(
      environment.createCompanyIdentityRuntimeConfig({
        COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
        COMPANY_AUTH_DATABASE_POOL_MAX: "7",
        NODE_ENV: "test",
      })
    ).toEqual({ databaseUrl: RUNTIME_URL, nodeEnv: "test", poolMax: 7 });
    expect(
      environment.createCompanyIdentityDirectConfig({
        COMPANY_AUTH_DIRECT_DATABASE_URL: DIRECT_URL,
      })
    ).toEqual({ directDatabaseUrl: DIRECT_URL });
    expect(
      environment.createCompanyIdentityTestConfig({
        COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL: TEST_ADMIN_URL,
      })
    ).toEqual({ adminDatabaseUrl: TEST_ADMIN_URL });
  });

  it("never falls back to product or differently privileged database variables", async () => {
    const environment = await loadEnvironmentModule();
    const productUrl =
      "postgresql://product:PRODUCT_PASSWORD_MUST_NOT_LEAK@127.0.0.1:5432/reading_advantage";

    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityRuntimeConfig({
          DATABASE_URL: productUrl,
          DIRECT_DATABASE_URL: productUrl,
        }),
      /COMPANY_AUTH_DATABASE_URL|required|unrecognized/i,
      [productUrl, "PRODUCT_PASSWORD_MUST_NOT_LEAK"]
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityDirectConfig({
          COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
          DIRECT_DATABASE_URL: productUrl,
        }),
      /COMPANY_AUTH_DIRECT_DATABASE_URL|required|unrecognized/i,
      [productUrl, "PRODUCT_PASSWORD_MUST_NOT_LEAK"]
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityTestConfig({ DATABASE_URL: productUrl }),
      /COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL|required|unrecognized/i,
      [productUrl, "PRODUCT_PASSWORD_MUST_NOT_LEAK"]
    );
  });

  it("requires runtime and direct URLs to target exactly company_identity", async () => {
    const environment = await loadEnvironmentModule();

    for (const invalidPath of [
      "reading_advantage",
      "company_identity_test",
      "company_identity/",
    ]) {
      const runtimeUrl = `postgresql://runtime:RUNTIME_PATH_SECRET@127.0.0.1:6432/${invalidPath}`;
      const directUrl = `postgresql://migrator:DIRECT_PATH_SECRET@127.0.0.1:5432/${invalidPath}`;

      expectSecretSafeError(
        () =>
          environment.createCompanyIdentityRuntimeConfig({
            COMPANY_AUTH_DATABASE_URL: runtimeUrl,
          }),
        /company_identity|database pathname/i,
        [runtimeUrl, "RUNTIME_PATH_SECRET"]
      );
      expectSecretSafeError(
        () =>
          environment.createCompanyIdentityDirectConfig({
            COMPANY_AUTH_DIRECT_DATABASE_URL: directUrl,
          }),
        /company_identity|database pathname/i,
        [directUrl, "DIRECT_PATH_SECRET"]
      );
    }
  });

  it("requires PostgreSQL URLs rather than accepting arbitrary URL schemes", async () => {
    const environment = await loadEnvironmentModule();

    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityRuntimeConfig({
          COMPANY_AUTH_DATABASE_URL: "https://db.example.com/company_identity",
        }),
      /postgresql|protocol/i,
      []
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityDirectConfig({
          COMPANY_AUTH_DIRECT_DATABASE_URL:
            "file:///tmp/company_identity?password=FILE_SECRET_MUST_NOT_LEAK",
        }),
      /postgresql|protocol/i,
      ["FILE_SECRET_MUST_NOT_LEAK"]
    );
  });

  it("defaults the bounded runtime pool to 3 and accepts only integers 1 through 20", async () => {
    const environment = await loadEnvironmentModule();

    expect(
      environment.createCompanyIdentityRuntimeConfig({
        COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
      }).poolMax
    ).toBe(3);

    for (const poolMax of ["1", "20"]) {
      expect(
        environment.createCompanyIdentityRuntimeConfig({
          COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
          COMPANY_AUTH_DATABASE_POOL_MAX: poolMax,
        }).poolMax
      ).toBe(Number(poolMax));
    }

    for (const poolMax of ["0", "21", "3.5", "not-a-number", " "]) {
      expectSecretSafeError(
        () =>
          environment.createCompanyIdentityRuntimeConfig({
            COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
            COMPANY_AUTH_DATABASE_POOL_MAX: poolMax,
          }),
        /COMPANY_AUTH_DATABASE_POOL_MAX|integer|1.*20/i,
        []
      );
    }
  });

  it("accepts only a loopback PostgreSQL 5432 admin URL for the postgres database", async () => {
    const environment = await loadEnvironmentModule();

    for (const hostname of ["localhost", "127.0.0.1", "[::1]"]) {
      const adminDatabaseUrl = `postgresql://postgres:local-secret@${hostname}:5432/postgres`;
      expect(
        environment.createCompanyIdentityTestConfig({
          COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL: adminDatabaseUrl,
        }).adminDatabaseUrl
      ).toBe(adminDatabaseUrl);
    }

    for (const adminDatabaseUrl of [
      "postgresql://postgres:REMOTE_SECRET@db.example.com:5432/postgres",
      "postgresql://postgres:PORT_SECRET@127.0.0.1:6432/postgres",
      "postgresql://postgres:DB_SECRET@127.0.0.1:5432/reading_advantage",
      "postgresql://postgres:QUERY_SECRET@127.0.0.1:5432/postgres?options=--dbname%3Dreading_advantage",
    ]) {
      expectSecretSafeError(
        () =>
          environment.createCompanyIdentityTestConfig({
            COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL: adminDatabaseUrl,
          }),
        /loopback|5432|postgres|query/i,
        [adminDatabaseUrl, new URL(adminDatabaseUrl).password]
      );
    }
  });

  it("rejects unknown keys in every DB-owned parser", async () => {
    const environment = await loadEnvironmentModule();

    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityRuntimeConfig({
          COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
          COMPANY_AUTH_RUNTIME_UNREVIEWED: "true",
        }),
      /unrecognized|unknown|COMPANY_AUTH_RUNTIME_UNREVIEWED/i,
      []
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityDirectConfig({
          COMPANY_AUTH_DIRECT_DATABASE_URL: DIRECT_URL,
          COMPANY_AUTH_DIRECT_UNREVIEWED: "true",
        }),
      /unrecognized|unknown|COMPANY_AUTH_DIRECT_UNREVIEWED/i,
      []
    );
    expectSecretSafeError(
      () =>
        environment.createCompanyIdentityTestConfig({
          COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL: TEST_ADMIN_URL,
          COMPANY_IDENTITY_TEST_UNREVIEWED: "true",
        }),
      /unrecognized|unknown|COMPANY_IDENTITY_TEST_UNREVIEWED/i,
      []
    );
  });

  it("returns deeply frozen configuration objects", async () => {
    const environment = await loadEnvironmentModule();
    const configs = [
      environment.createCompanyIdentityRuntimeConfig({
        COMPANY_AUTH_DATABASE_URL: RUNTIME_URL,
      }),
      environment.createCompanyIdentityDirectConfig({
        COMPANY_AUTH_DIRECT_DATABASE_URL: DIRECT_URL,
      }),
      environment.createCompanyIdentityTestConfig({
        COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL: TEST_ADMIN_URL,
      }),
    ];

    for (const config of configs) {
      expectDeeplyFrozen(config);
      expect(Reflect.set(config as object, "unexpected", true)).toBe(false);
    }
  });
});
