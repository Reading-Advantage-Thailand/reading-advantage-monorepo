import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import * as productClient from "../../client.js";
import * as productRoot from "../../index.js";
import * as productSchema from "../../schema/index.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const PACKAGE_ROOT = resolve(HERE, "../../..");
const IDENTITY_SUBPATH_MODULE = "../index.js";

const IDENTITY_ONLY_EXPORTS = [
  "companyAccounts",
  "companyPasswordCredentials",
  "companyOrganizations",
  "companyOrganizationMemberships",
  "companyRoleAssignments",
  "companyApplications",
  "companyApplicationRoleDefinitions",
  "companyApplicationRoleAssignments",
  "companySsoSessions",
  "companyApplicationSessions",
  "companyOidcClients",
  "companyOidcRedirectUris",
  "companyOidcAuthorizationCodes",
  "companyIdentityAuditEvents",
  "companyLoginAttempts",
  "companyLoginRateLimitBuckets",
  "companyIdentityIdempotencyRecords",
  "companyIdentityRuntimeEnvSchema",
  "companyIdentityDirectEnvSchema",
  "companyIdentityTestEnvSchema",
  "createCompanyIdentityRuntimeConfig",
  "createCompanyIdentityDirectConfig",
  "createCompanyIdentityTestConfig",
  "createCompanyIdentityRuntimeClient",
  "createCompanyIdentityDirectClient",
] as const;

async function loadIdentitySubpath(): Promise<Record<string, unknown>> {
  try {
    return (await import(IDENTITY_SUBPATH_MODULE)) as Record<string, unknown>;
  } catch (error) {
    throw new Error(
      "The dedicated @reading-advantage/db/company-identity source entrypoint is absent; " +
        "implement src/company-identity/index.ts without widening the product barrels.",
      { cause: error },
    );
  }
}

describe("company identity package boundary", () => {
  it("keeps identity schema, clients, and environment exports out of every product entrypoint", () => {
    for (const [entrypoint, moduleExports] of [
      ["@reading-advantage/db", productRoot],
      ["@reading-advantage/db/schema", productSchema],
      ["@reading-advantage/db/client", productClient],
    ] as const) {
      for (const exportName of IDENTITY_ONLY_EXPORTS) {
        expect(
          moduleExports,
          `${entrypoint} must not expose identity-only export ${exportName}; ` +
            "approved consumers use the dedicated company-identity subpath.",
        ).not.toHaveProperty(exportName);
      }
    }
  });

  it("declares one dedicated package subpath instead of widening root, schema, or client exports", () => {
    const packageJson = JSON.parse(
      readFileSync(join(PACKAGE_ROOT, "package.json"), "utf8"),
    ) as {
      exports?: Record<string, { import?: string; types?: string }>;
    };

    expect(packageJson.exports?.["./company-identity"]).toEqual({
      types: "./dist/company-identity/index.d.ts",
      import: "./dist/company-identity/index.js",
    });
  });

  it("makes the complete DB-owned identity surface available only from the dedicated subpath", async () => {
    const identity = await loadIdentitySubpath();

    for (const exportName of IDENTITY_ONLY_EXPORTS) {
      expect(
        identity,
        `@reading-advantage/db/company-identity must expose ${exportName}.`,
      ).toHaveProperty(exportName);
    }
  });
});
