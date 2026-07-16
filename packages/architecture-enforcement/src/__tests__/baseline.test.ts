import { describe, expect, it } from "vitest";
import {
  computeRulesetHash,
  createArchitectureBaseline,
  createExactExceptions,
  serializeArchitectureBaseline,
  validateArchitectureBaseline,
} from "../baseline.js";
import {
  architectureConfigSchema,
  type ArchitectureConfig,
} from "../contracts.js";
import type { DirectViolationCandidate } from "../inventory.js";

const databaseRule = {
  schemaVersion: 1,
  id: "DATABASE_BOUNDARY",
  domain: "database",
  description: "Database access stays inside approved ownership roots.",
  severity: "error",
  findingKinds: ["static-import", "query-call"],
  moduleMatchers: [{ kind: "exact", value: "@reading-advantage/db" }],
  resourceMatchers: [{ kind: "exact", value: "database-table:jobs" }],
  resolvedTargetRoots: ["packages/db/src/"],
  ownershipRootIds: ["database-package"],
} as const;

const providerRule = {
  schemaVersion: 1,
  id: "AI_PROVIDER_BOUNDARY",
  domain: "provider",
  description: "Provider clients stay inside approved adapter roots.",
  severity: "error",
  findingKinds: ["static-import", "environment-read"],
  moduleMatchers: [{ kind: "exact", value: "openai" }],
  resourceMatchers: [{ kind: "exact", value: "environment:OPENAI_API_KEY" }],
  resolvedTargetRoots: ["packages/ai/src/providers/"],
  ownershipRootIds: ["provider-package"],
} as const;

const config: ArchitectureConfig = architectureConfigSchema.parse({
  schemaVersion: 1,
  rules: [databaseRule, providerRule],
  ownershipRoots: [
    {
      schemaVersion: 1,
      id: "database-package",
      domain: "database",
      path: "packages/db/src/",
      kind: "database",
      ruleIds: ["DATABASE_BOUNDARY"],
      owner: "database-platform",
      rationale: "The database package owns low-level persistence primitives.",
    },
    {
      schemaVersion: 1,
      id: "provider-package",
      domain: "provider",
      path: "packages/ai/src/providers/",
      kind: "adapter",
      ruleIds: ["AI_PROVIDER_BOUNDARY"],
      owner: "ai-platform",
      rationale: "The provider package owns direct vendor client construction.",
    },
  ],
  exactExceptions: [],
  baselineFiles: {
    database: "config/baselines/database.json",
    provider: "config/baselines/provider.json",
  },
});

const candidates: DirectViolationCandidate[] = [
  {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/report.ts",
    line: 4,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "@reading-advantage/db",
    owner: "sales-platform",
    rationale:
      "Reviewed direct database match selected by DATABASE_BOUNDARY; migrate it into an approved ownership root.",
    proposedDisposition: "baseline-review",
  },
  {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/report.ts",
    line: 9,
    column: 3,
    evidenceKind: "query-call",
    resource: "database-table:jobs",
    owner: "sales-platform",
    rationale:
      "Reviewed direct database match selected by DATABASE_BOUNDARY; migrate it into an approved ownership root.",
    proposedDisposition: "baseline-review",
  },
  {
    schemaVersion: 1,
    ruleId: "AI_PROVIDER_BOUNDARY",
    domain: "provider",
    sourcePath: "apps/marketing/src/__tests__/ai.test.ts",
    line: 2,
    column: 1,
    evidenceKind: "static-import",
    importSpecifier: "openai",
    owner: "marketing-platform",
    rationale:
      "Reviewed direct provider match selected by AI_PROVIDER_BOUNDARY; migrate it into an approved ownership root.",
    proposedDisposition: "exact-exception-review",
  },
];

const workspaceTargets = new Map([
  ["@reading-advantage/db", "packages/db/src/index.ts"],
  ["@reading-advantage/db/alias", "packages/db/src/index.ts"],
]);

describe("architecture baseline freeze", () => {
  it("creates canonical accountable baseline entries with path-independent semantic identities", () => {
    const baseline = createArchitectureBaseline(
      candidates,
      config,
      "database",
      workspaceTargets,
    );
    const repeated = createArchitectureBaseline(
      [...candidates].reverse(),
      { ...config, rules: [...config.rules].reverse() },
      "database",
      workspaceTargets,
    );

    expect(baseline).toEqual(repeated);
    expect(baseline.entries).toHaveLength(2);
    expect(baseline.entries.map((entry) => entry.instanceKey)).toEqual(
      [...baseline.entries.map((entry) => entry.instanceKey)].sort(),
    );
    expect(
      baseline.entries.find((entry) => entry.evidenceKind === "static-import")
        ?.resolvedTarget,
    ).toBe("packages/db/src/index.ts");
    expect(
      baseline.entries.every((entry) => entry.owner === "sales-platform"),
    ).toBe(true);

    const moved = createArchitectureBaseline(
      [
        {
          ...candidates[0]!,
          sourcePath: "apps/sales/src/moved-report.ts",
          line: 1,
        },
      ],
      config,
      "database",
      workspaceTargets,
    );
    const originalImport = baseline.entries.find(
      (entry) => entry.evidenceKind === "static-import",
    );
    expect(moved.entries[0]?.semanticKey).toBe(originalImport?.semanticKey);
    expect(moved.entries[0]?.instanceKey).not.toBe(originalImport?.instanceKey);

    const aliased = createArchitectureBaseline(
      [
        {
          ...candidates[0]!,
          importSpecifier: "@reading-advantage/db/alias",
        },
      ],
      config,
      "database",
      workspaceTargets,
    );
    expect(aliased.entries[0]?.semanticKey).toBe(originalImport?.semanticKey);
    expect(aliased.entries[0]?.instanceKey).toBe(originalImport?.instanceKey);
  });

  it("turns reviewed test candidates into deduplicated exact per-rule exceptions", () => {
    const repeatedCandidate = { ...candidates[2]!, line: 8, column: 4 };
    const exceptions = createExactExceptions(
      [candidates[2]!, repeatedCandidate],
      config,
    );

    expect(exceptions).toHaveLength(1);
    expect(exceptions[0]).toMatchObject({
      ruleId: "AI_PROVIDER_BOUNDARY",
      sourcePath: "apps/marketing/src/__tests__/ai.test.ts",
      owner: "marketing-platform",
    });
    expect(exceptions[0]?.id).toMatch(/^reviewed-[a-f0-9]{16}$/);
  });

  it("rejects unreviewed exception candidates and malformed or stale baselines", () => {
    expect(() =>
      createArchitectureBaseline(candidates, config, "provider"),
    ).toThrow(/exact exception review/i);

    const baseline = createArchitectureBaseline(
      candidates,
      config,
      "database",
      workspaceTargets,
    );
    expect(() =>
      validateArchitectureBaseline(
        { ...baseline, rulesetHash: "0".repeat(64) },
        candidates,
        config,
        "database",
        workspaceTargets,
      ),
    ).toThrow(/ruleset hash/i);
    expect(() =>
      validateArchitectureBaseline(
        { ...baseline, entries: baseline.entries.slice(1) },
        candidates,
        config,
        "database",
        workspaceTargets,
      ),
    ).toThrow(/snapshot/i);
    expect(() =>
      validateArchitectureBaseline(
        {
          ...baseline,
          entries: [
            {
              ...baseline.entries[0]!,
              sourcePath: "apps/*/src/report.ts",
            },
          ],
        },
        candidates,
        config,
        "database",
        workspaceTargets,
      ),
    ).toThrow();

    const provider = createArchitectureBaseline([], config, "provider");
    expect(() =>
      validateArchitectureBaseline(
        provider,
        candidates,
        config,
        "database",
        workspaceTargets,
      ),
    ).toThrow(/expected database baseline/i);
  });

  it("serializes byte-identically and hashes semantically equivalent rule ordering", () => {
    const baseline = createArchitectureBaseline(
      candidates,
      config,
      "database",
      workspaceTargets,
    );
    const reordered: ArchitectureConfig = {
      ...config,
      rules: [...config.rules].reverse(),
      ownershipRoots: [...config.ownershipRoots].reverse(),
    };

    expect(computeRulesetHash(config, "database")).toBe(
      computeRulesetHash(reordered, "database"),
    );
    expect(serializeArchitectureBaseline(baseline)).toBe(
      serializeArchitectureBaseline(
        createArchitectureBaseline(
          [...candidates].reverse(),
          config,
          "database",
          workspaceTargets,
        ),
      ),
    );
    expect(serializeArchitectureBaseline(baseline)).toMatch(/\n$/);
  });
});
