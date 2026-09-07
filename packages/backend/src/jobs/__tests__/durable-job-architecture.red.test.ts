import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";
import { durableJobs as durableJobsForArchitectureCounterexample } from "@reading-advantage/db";

const REPOSITORY_ROOT = resolve(import.meta.dirname, "../../../../..");
const TENANT_REGISTRY_SOURCE_PATH = "packages/domain/src/tenant-registry.ts";
const ARCHITECTURE_TEST_SOURCE_PATH =
  "packages/backend/src/jobs/__tests__/durable-job-architecture.red.test.ts";
const TENANT_REGISTRY_PATH = resolve(
  REPOSITORY_ROOT,
  TENANT_REGISTRY_SOURCE_PATH,
);
const TENANT_REGISTRY_MODULE_PATH = resolve(
  REPOSITORY_ROOT,
  TENANT_REGISTRY_SOURCE_PATH,
);
const ARCHITECTURE_ANALYZER_MODULE_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/architecture-enforcement/src/analyzer.ts",
);
const OWNERSHIP_MAP_MODULE_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/architecture-enforcement/src/ownership-map.ts",
);
const WORKSPACE_RESOLUTION_MODULE_PATH = resolve(
  REPOSITORY_ROOT,
  "packages/architecture-enforcement/src/workspace-resolution.ts",
);
const DATABASE_MODULE_SPECIFIER = "@reading-advantage/db";

interface DurableJobOwnershipRule {
  readonly id: string;
  readonly findingKinds: readonly string[];
  readonly resourceMatchers: readonly {
    readonly kind: string;
    readonly value: string;
  }[];
  readonly resolvedTargetRoots: readonly string[];
  readonly ownershipRootIds: readonly string[];
}

interface OwnershipException {
  readonly schemaVersion: number;
  readonly id: string;
  readonly ruleId: string;
  readonly sourcePath: string;
  readonly owner: string;
  readonly rationale: string;
}

interface OwnershipMapModule {
  readonly loadOwnershipMap: (policyVersion?: "v1" | "v2") => {
    readonly rules: readonly DurableJobOwnershipRule[];
    readonly exactExceptions: readonly OwnershipException[];
  };
}

interface ArchitectureAnalyzerModule {
  readonly analyzeArchitectureSources: (options: {
    readonly repoRoot: string;
    readonly sourcePaths: readonly string[];
    readonly workspaceTargets: ReadonlyMap<string, string>;
    readonly config: unknown;
  }) => Promise<{
    readonly parseErrors: readonly unknown[];
    readonly findings: readonly {
      readonly ruleId: string;
      readonly evidenceKind: string;
      readonly resource?: string;
      readonly sourcePath: string;
    }[];
  }>;
}

interface WorkspaceResolutionModule {
  readonly loadWorkspaceModuleTargets: (
    repoRoot: string,
  ) => Promise<ReadonlyMap<string, string>>;
}

interface TenantRegistryModule {
  readonly classifyTable: (table: unknown) => string;
}

interface DatabaseModule {
  readonly durableJobs: unknown;
  readonly durableJobAuditEvents: unknown;
}

const EXPECTED_DURABLE_EVIDENCE_KINDS = [
  "static-import",
  "namespace-import",
  "dynamic-import",
  "commonjs-require",
  "re-export",
  "client-construction",
  "query-call",
] as const;

const EXPECTED_TENANT_REGISTRY_EXCEPTION = {
  schemaVersion: 1,
  id: "durable-job-tenant-registry-classification",
  ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
  sourcePath: TENANT_REGISTRY_SOURCE_PATH,
  owner: "domain-platform",
  rationale:
    "Mandatory TenantDB classification only; no durable-job queries or mutation.",
} as const;

const EXPECTED_REVIEW_JOBS_SCHEMA_EXCEPTION = {
  schemaVersion: 1,
  id: "reconciliation-review-jobs-schema",
  ruleId: "DURABLE_JOB_DATABASE_BOUNDARY",
  sourcePath: "packages/db/src/__tests__/phase-1-review-jobs-schema.test.ts",
  owner: "database-platform",
  rationale:
    "This exact database schema test imports the durable review-jobs table to verify its contract; the covered finding is enumerated and production paths remain enforced.",
} as const;

function runOutOfRootDurableJobQueryCounterexample(): unknown {
  const queryBuilder = {
    select: () => ({
      from: (table: unknown) => table,
    }),
  };

  return queryBuilder.select().from(durableJobsForArchitectureCounterexample);
}

describe("durable-job architecture Red contract", () => {
  it("preserves REFERENTIAL classification for both durable job tables", async () => {
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
  }, 5_000);

  it("keeps durable table ownership in approved roots with reviewed exceptions", async () => {
    const ownershipMap = (await import(
      pathToFileURL(OWNERSHIP_MAP_MODULE_PATH).href
    )) as OwnershipMapModule;
    const analyzer = (await import(
      pathToFileURL(ARCHITECTURE_ANALYZER_MODULE_PATH).href
    )) as ArchitectureAnalyzerModule;
    const workspaceResolution = (await import(
      pathToFileURL(WORKSPACE_RESOLUTION_MODULE_PATH).href
    )) as WorkspaceResolutionModule;
    const config = ownershipMap.loadOwnershipMap("v2");
    const tenantRegistrySource = readFileSync(TENANT_REGISTRY_PATH, "utf8");
    const durableJobRule = config.rules.find(
      (rule) => rule.id === "DURABLE_JOB_DATABASE_BOUNDARY",
    );

    expect(durableJobRule).toBeDefined();
    expect(durableJobRule?.ownershipRootIds).toEqual([
      "database-schema",
      "database-migrations",
      "postgres-job-adapter",
    ]);
    expect(durableJobRule?.findingKinds).toEqual(
      EXPECTED_DURABLE_EVIDENCE_KINDS,
    );
    expect(durableJobRule?.resolvedTargetRoots).toEqual([]);
    expect(durableJobRule?.resourceMatchers).toEqual([
      { kind: "exact", value: "database-table:review_jobs" },
      { kind: "exact", value: "database-table:jobs" },
      { kind: "exact", value: "database-table:durable_jobs" },
    ]);
    const durableJobExceptions = config.exactExceptions.filter(
      (exception) => exception.ruleId === "DURABLE_JOB_DATABASE_BOUNDARY",
    );
    expect(durableJobExceptions).toHaveLength(2);
    expect(durableJobExceptions).toContainEqual(
      EXPECTED_REVIEW_JOBS_SCHEMA_EXCEPTION,
    );
    expect(durableJobExceptions).toContainEqual(
      EXPECTED_TENANT_REGISTRY_EXCEPTION,
    );

    const result = await analyzer.analyzeArchitectureSources({
      repoRoot: REPOSITORY_ROOT,
      sourcePaths: [TENANT_REGISTRY_SOURCE_PATH, ARCHITECTURE_TEST_SOURCE_PATH],
      workspaceTargets:
        await workspaceResolution.loadWorkspaceModuleTargets(REPOSITORY_ROOT),
      config,
    });

    expect(result.parseErrors).toEqual([]);
    const directDurableTableBindings = [
      "reviewJobs",
      "durableJobs",
      "durableJobAuditEvents",
      "reviewJobAdoptionAuditEvents",
      "reviewJobDurableBindings",
      "reviewJobDurableAdoption",
      "reviewJobMigrationIssues",
    ].filter((binding) => tenantRegistrySource.includes(binding));
    expect(directDurableTableBindings).toEqual([
      "reviewJobs",
      "durableJobs",
      "durableJobAuditEvents",
      "reviewJobAdoptionAuditEvents",
      "reviewJobDurableBindings",
      "reviewJobDurableAdoption",
      "reviewJobMigrationIssues",
    ]);
    for (const binding of directDurableTableBindings) {
      expect(tenantRegistrySource).toMatch(
        new RegExp(`register\\(${binding},\\s*"REFERENTIAL"\\)`),
      );
    }

    const durableJobFindings = result.findings.filter(
      (finding) => finding.ruleId === "DURABLE_JOB_DATABASE_BOUNDARY",
    );
    expect(
      durableJobFindings.filter(
        (finding) => finding.sourcePath === TENANT_REGISTRY_SOURCE_PATH,
      ),
    ).toEqual([]);

    expect(runOutOfRootDurableJobQueryCounterexample()).toBe(
      durableJobsForArchitectureCounterexample,
    );
    expect(
      durableJobFindings.filter(
        (finding) =>
          finding.sourcePath === ARCHITECTURE_TEST_SOURCE_PATH &&
          finding.evidenceKind === "query-call",
      ),
    ).toEqual([
      expect.objectContaining({
        evidenceKind: "query-call",
        resource: "database-table:durable_jobs",
        sourcePath: ARCHITECTURE_TEST_SOURCE_PATH,
      }),
    ]);
  }, 10_000);
});
