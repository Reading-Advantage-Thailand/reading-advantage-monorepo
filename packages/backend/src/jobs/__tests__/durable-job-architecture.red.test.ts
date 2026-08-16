import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../../../..");
const TENANT_REGISTRY_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/domain/src/tenant-registry.ts",
);
const OWNERSHIP_MAP_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/architecture-enforcement/src/config/ownership-map.v1.json",
);
const TENANT_REGISTRY_MODULE_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/domain/src/tenant-registry.ts",
);
const DATABASE_MODULE_SPECIFIER = "@reading-advantage/db";

interface DurableJobOwnershipRule {
  readonly id: string;
  readonly resourceMatchers: readonly { readonly value: string }[];
  readonly resolvedTargetRoots: readonly string[];
  readonly ownershipRootIds: readonly string[];
}

interface ReviewedOwnershipException {
  readonly schemaVersion: number;
  readonly id: string;
  readonly ruleId: string;
  readonly sourcePath: string;
  readonly owner: string;
  readonly rationale: string;
}

interface OwnershipMapFixture {
  readonly rules: readonly DurableJobOwnershipRule[];
  readonly exactExceptions: readonly ReviewedOwnershipException[];
}

interface TenantRegistryModule {
  readonly classifyTable: (table: unknown) => string;
}

interface DatabaseModule {
  readonly durableJobs: unknown;
  readonly durableJobAuditEvents: unknown;
}

describe("durable-job architecture Red contract", () => {
  it("requires one reviewed tenant-registry exception and preserves REFERENTIAL classification", async () => {
    const tenantRegistrySource = readFileSync(TENANT_REGISTRY_PATH, "utf8");
    const ownershipMap = JSON.parse(
      readFileSync(OWNERSHIP_MAP_PATH, "utf8"),
    ) as OwnershipMapFixture;
    const durableJobRule = ownershipMap.rules.find(
      (rule) => rule.id === "DURABLE_JOB_DATABASE_BOUNDARY",
    );

    expect(tenantRegistrySource).toContain("durableJobs");
    expect(tenantRegistrySource).toContain("durableJobAuditEvents");
    expect(durableJobRule).toBeDefined();
    expect(durableJobRule?.ownershipRootIds).toEqual([
      "database-schema",
      "database-migrations",
      "postgres-job-adapter",
    ]);
    expect(durableJobRule?.resolvedTargetRoots).toEqual([]);
    expect(
      durableJobRule?.resourceMatchers.map((matcher) => matcher.value),
    ).toEqual([
      "database-table:review_jobs",
      "database-table:jobs",
      "database-table:durable_jobs",
    ]);
    const tenantRegistry = (await import(
      TENANT_REGISTRY_MODULE_PATH
    )) as TenantRegistryModule;
    const database = (await import(
      /* @vite-ignore */ DATABASE_MODULE_SPECIFIER
    )) as DatabaseModule;
    expect(tenantRegistry.classifyTable(database.durableJobs)).toBe(
      "REFERENTIAL",
    );
    expect(tenantRegistry.classifyTable(database.durableJobAuditEvents)).toBe(
      "REFERENTIAL",
    );
    expect(tenantRegistrySource).toContain("register(durableJobs");
    expect(tenantRegistrySource).toContain("register(durableJobAuditEvents");

    const expectedException: ReviewedOwnershipException = {
      schemaVersion: 1,
      id: "durable-job-tenant-registry-classification",
      ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
      sourcePath: "packages/domain/src/tenant-registry.ts",
      owner: "domain-platform",
      rationale:
        "Mandatory TenantDB classification only; no durable-job queries or mutation.",
    };
    expect(
      ownershipMap.exactExceptions.filter(
        (exception) =>
          exception.sourcePath === expectedException.sourcePath &&
          exception.ruleId === expectedException.ruleId,
      ),
    ).toEqual([expectedException]);
  }, 5_000);
});
