import { describe, expect, it } from "vitest";
import {
  evaluateOwnership,
  loadOwnershipMap,
  type OwnershipCandidate,
} from "../ownership-map.js";

const databaseImport: OwnershipCandidate = {
  ruleId: "DATABASE_BOUNDARY",
  sourcePath: "apps/marketing/app/api/leads/route.ts",
  evidenceKind: "static-import",
  importSpecifier: "@reading-advantage/db",
  resolvedTarget: "packages/db/src/index.ts",
};

describe("architecture ownership map", () => {
  it("loads a strict, cross-referenced database and provider policy", () => {
    const map = loadOwnershipMap();

    expect(map.rules.map((rule) => rule.id)).toEqual([
      "DATABASE_BOUNDARY",
      "DURABLE_JOB_DATABASE_BOUNDARY",
      "COMPANY_IDENTITY_DB_BOUNDARY",
      "COMPANY_IDENTITY_PRODUCT_ISOLATION",
      "AI_PROVIDER_BOUNDARY",
      "STORAGE_PROVIDER_BOUNDARY",
      "INTEGRATION_PROVIDER_BOUNDARY",
    ]);
    expect(map.rules.every((rule) => rule.ownershipRootIds.length > 0)).toBe(
      true,
    );
    expect(
      map.exactExceptions.every(
        (exception) =>
          !/[*!?{}[\]]/.test(exception.sourcePath) &&
          exception.sourcePath.endsWith(".ts") &&
          (exception.sourcePath.includes("/__tests__/") ||
            exception.sourcePath.includes("/fixtures/")),
      ),
    ).toBe(true);
  });

  it("allows general database access only from named backend ownership roots", () => {
    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ...databaseImport,
        sourcePath: "packages/domain/src/articles/queries.ts",
      }),
    ).toMatchObject({
      status: "allowed",
      reasonCode: "approved-ownership-root",
      ownershipRootId: "domain-database-access",
    });

    expect(evaluateOwnership(loadOwnershipMap(), databaseImport)).toEqual({
      status: "violation",
      reasonCode: "outside-approved-root",
      ruleId: "DATABASE_BOUNDARY",
    });
  });

  it("keeps durable job-table queries inside schema, migrations, and the exact PostgreSQL adapter", () => {
    const jobQuery: OwnershipCandidate = {
      ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
      sourcePath: "services/worker/src/poll.ts",
      evidenceKind: "query-call",
      importSpecifier: "@reading-advantage/db/schema",
      resolvedTarget: "packages/db/src/schema/codecamp.ts",
      resource: "database-table:review_jobs",
    };

    for (const [sourcePath, ownershipRootId] of [
      ["packages/db/src/schema/jobs.ts", "database-schema"],
      ["packages/db/drizzle/0040_durable_jobs.ts", "database-migrations"],
      [
        "packages/backend/src/jobs/adapters/postgres/claim-jobs.ts",
        "postgres-job-adapter",
      ],
    ] as const) {
      expect(
        evaluateOwnership(loadOwnershipMap(), { ...jobQuery, sourcePath }),
      ).toMatchObject({
        status: "allowed",
        reasonCode: "approved-ownership-root",
        ownershipRootId,
      });
    }

    for (const sourcePath of [
      "services/worker/src/poll.ts",
      "packages/webhooks/src/jobs/claim.ts",
      "apps/marketing/app/api/jobs/route.ts",
      "packages/backend/src/jobs/claim.ts",
      "packages/backend/src/jobs/adapters/postgresql/claim.ts",
    ]) {
      expect(
        evaluateOwnership(loadOwnershipMap(), { ...jobQuery, sourcePath }),
      ).toEqual({
        status: "violation",
        reasonCode: "outside-approved-root",
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
      });
    }

    for (const importSpecifier of ["postgres", "pg"]) {
      expect(
        evaluateOwnership(loadOwnershipMap(), {
          ...jobQuery,
          sourcePath: "services/worker/src/raw-job-query.ts",
          importSpecifier,
          resolvedTarget: `external:${importSpecifier}`,
        }),
      ).toMatchObject({
        status: "violation",
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
      });
    }

    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
        sourcePath: "packages/backend/src/modules/articles/queries.ts",
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/db/schema",
        resolvedTarget: "packages/db/src/schema/articles.ts",
      }),
    ).toMatchObject({
      status: "allowed",
      reasonCode: "rule-not-applicable",
    });
  });

  it("isolates Company Identity persistence from product apps and education tenancy", () => {
    const identityImport: OwnershipCandidate = {
      ruleId: "COMPANY_IDENTITY_DB_BOUNDARY",
      sourcePath: "apps/sales/app/api/session/route.ts",
      evidenceKind: "static-import",
      importSpecifier: "@reading-advantage/db/company-identity",
      resolvedTarget: "packages/db/src/company-identity/index.ts",
    };

    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ...identityImport,
        sourcePath:
          "packages/backend/src/modules/company-identity/adapters/postgres/index.ts",
      }),
    ).toMatchObject({
      status: "allowed",
      ownershipRootId: "company-identity-postgres-adapter",
    });
    expect(evaluateOwnership(loadOwnershipMap(), identityImport)).toEqual({
      status: "violation",
      reasonCode: "outside-approved-root",
      ruleId: "COMPANY_IDENTITY_DB_BOUNDARY",
    });

    for (const candidate of [
      {
        ...identityImport,
        sourcePath:
          "apps/marketing/app/api/session/route-imports-postgres-adapter.ts",
        importSpecifier:
          "@reading-advantage/backend/modules/company-identity/adapters/postgres",
        resolvedTarget:
          "packages/backend/src/modules/company-identity/adapters/postgres/index.ts",
      },
      {
        ...identityImport,
        sourcePath: "apps/sales/lib/postgres-company-env.ts",
        evidenceKind: "client-construction" as const,
        importSpecifier: "pg",
        resolvedTarget: "external:pg",
        resource: "environment:COMPANY_AUTH_DATABASE_URL",
      },
    ]) {
      expect(evaluateOwnership(loadOwnershipMap(), candidate)).toMatchObject({
        status: "violation",
        ruleId: "COMPANY_IDENTITY_DB_BOUNDARY",
      });
    }

    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ...identityImport,
        sourcePath: "packages/domain/src/reporting/postgres.ts",
        importSpecifier: "postgres",
        resolvedTarget: "external:postgres",
      }),
    ).toMatchObject({
      status: "allowed",
      reasonCode: "rule-not-applicable",
    });

    for (const sourcePath of [
      "packages/db/src/schema/index.ts",
      "packages/domain/src/tenant-registry.ts",
      "apps/marketing/app/api/session/route.ts",
    ]) {
      expect(
        evaluateOwnership(loadOwnershipMap(), {
          ...identityImport,
          ruleId: "COMPANY_IDENTITY_PRODUCT_ISOLATION",
          sourcePath,
          evidenceKind: "policy-reference",
        }),
      ).toMatchObject({
        status: "violation",
        ruleId: "COMPANY_IDENTITY_PRODUCT_ISOLATION",
      });
    }
  });

  it("allows internal AI and storage ports while restricting provider SDKs to exact adapter roots", () => {
    for (const candidate of [
      {
        ruleId: "AI_PROVIDER_BOUNDARY",
        sourcePath: "apps/marketing/lib/copy.ts",
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/ai",
        resolvedTarget: "packages/ai/src/index.ts",
      },
      {
        ruleId: "STORAGE_PROVIDER_BOUNDARY",
        sourcePath: "apps/sales/lib/assets.ts",
        evidenceKind: "static-import",
        importSpecifier: "@reading-advantage/storage",
        resolvedTarget: "packages/storage/src/index.ts",
      },
    ] satisfies OwnershipCandidate[]) {
      expect(evaluateOwnership(loadOwnershipMap(), candidate)).toMatchObject({
        status: "allowed",
        reasonCode: "rule-not-applicable",
      });
    }

    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ruleId: "AI_PROVIDER_BOUNDARY",
        sourcePath: "packages/ai/src/providers/openai.ts",
        evidenceKind: "static-import",
        importSpecifier: "@ai-sdk/openai",
        resolvedTarget: "external:@ai-sdk/openai",
      }),
    ).toMatchObject({
      status: "allowed",
      ownershipRootId: "ai-provider-adapters",
    });
    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ruleId: "AI_PROVIDER_BOUNDARY",
        sourcePath: "packages/ai/src/client.ts",
        evidenceKind: "static-import",
        importSpecifier: "@ai-sdk/openai",
        resolvedTarget: "external:@ai-sdk/openai",
      }),
    ).toMatchObject({ status: "violation" });

    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ruleId: "STORAGE_PROVIDER_BOUNDARY",
        sourcePath: "packages/storage/src/drivers/s3.ts",
        evidenceKind: "client-construction",
        importSpecifier: "@aws-sdk/client-s3",
        resolvedTarget: "external:@aws-sdk/client-s3",
      }),
    ).toMatchObject({
      status: "allowed",
      ownershipRootId: "storage-provider-adapters",
    });
    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ruleId: "STORAGE_PROVIDER_BOUNDARY",
        sourcePath: "packages/storage/src/factory.ts",
        evidenceKind: "static-import",
        importSpecifier: "@aws-sdk/client-s3",
        resolvedTarget: "external:@aws-sdk/client-s3",
      }),
    ).toMatchObject({ status: "violation" });
  });

  it("rejects provider credential reads outside their exact adapters", () => {
    for (const candidate of [
      {
        ruleId: "AI_PROVIDER_BOUNDARY",
        sourcePath: "apps/marketing/lib/ai-config.ts",
        evidenceKind: "environment-read",
        resource: "environment:OPENAI_API_KEY",
        resolvedTarget: "external:process.env",
      },
      {
        ruleId: "STORAGE_PROVIDER_BOUNDARY",
        sourcePath: "apps/sales/lib/storage-config.ts",
        evidenceKind: "environment-read",
        resource: "environment:AWS_SECRET_ACCESS_KEY",
        resolvedTarget: "external:process.env",
      },
      {
        ruleId: "INTEGRATION_PROVIDER_BOUNDARY",
        sourcePath: "apps/codecamp/lib/github-config.ts",
        evidenceKind: "environment-read",
        resource: "environment:GITHUB_APP_PRIVATE_KEY",
        resolvedTarget: "external:process.env",
      },
    ] satisfies OwnershipCandidate[]) {
      expect(evaluateOwnership(loadOwnershipMap(), candidate)).toMatchObject({
        status: "violation",
        ruleId: candidate.ruleId,
      });
    }
  });

  it("honors only exact reviewed test exceptions and fails closed for unknown rules", () => {
    expect(
      evaluateOwnership(loadOwnershipMap(), {
        ruleId: "STORAGE_PROVIDER_BOUNDARY",
        sourcePath: "packages/storage/src/__tests__/s3-driver.test.ts",
        evidenceKind: "static-import",
        importSpecifier: "@aws-sdk/client-s3",
        resolvedTarget: "external:@aws-sdk/client-s3",
      }),
    ).toMatchObject({
      status: "allowed",
      reasonCode: "exact-exception",
      exceptionId: "storage-s3-driver-test",
    });

    expect(() =>
      evaluateOwnership(loadOwnershipMap(), {
        ...databaseImport,
        ruleId: "UNREGISTERED_BOUNDARY",
      }),
    ).toThrow(/unknown architecture rule/i);
  });
});
