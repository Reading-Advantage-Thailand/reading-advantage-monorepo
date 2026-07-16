import { describe, expect, it } from "vitest";
import {
  architectureConfigSchema,
  architectureBaselineSchema,
  architectureFindingSchema,
  architectureRuleSchema,
  baselineEntrySchema,
  exactExceptionSchema,
  ownershipRootSchema,
} from "../contracts.js";

const databaseRule = {
  schemaVersion: 1,
  id: "DATABASE_BOUNDARY",
  domain: "database",
  description: "Database access stays inside approved ownership roots.",
  severity: "error",
  findingKinds: ["static-import", "query-call"],
  moduleMatchers: [
    { kind: "exact", value: "drizzle-orm" },
    { kind: "prefix", value: "@reading-advantage/db/" },
  ],
  resourceMatchers: [{ kind: "exact", value: "database-table:review_jobs" }],
  resolvedTargetRoots: ["packages/db/src/"],
  ownershipRootIds: ["database-package"],
} as const;

const databaseOwnershipRoot = {
  schemaVersion: 1,
  id: "database-package",
  domain: "database",
  path: "packages/db/src/",
  kind: "database",
  ruleIds: ["DATABASE_BOUNDARY"],
  owner: "database-platform",
  rationale: "The database package owns schema and low-level clients.",
} as const;

const databaseFinding = {
  schemaVersion: 1,
  ruleId: "DATABASE_BOUNDARY",
  domain: "database",
  sourcePath: "apps/marketing/app/api/example/route.ts",
  line: 3,
  column: 1,
  evidenceKind: "static-import",
  importSpecifier: "@reading-advantage/db",
  resolvedTarget: "packages/db/src/index.ts",
  semanticKey: "a".repeat(64),
  instanceKey: "b".repeat(64),
} as const;

const databaseException = {
  schemaVersion: 1,
  id: "database-test-fixture",
  ruleId: "DATABASE_BOUNDARY",
  sourcePath: "packages/db/src/__tests__/fixture.ts",
  owner: "database-platform",
  rationale: "Exact synthetic fixture for boundary verification.",
} as const;

const validConfig = {
  schemaVersion: 1,
  rules: [databaseRule],
  ownershipRoots: [databaseOwnershipRoot],
  exactExceptions: [databaseException],
  baselineFiles: {
    database: "config/baselines/database.json",
    provider: "config/baselines/provider.json",
  },
} as const;

describe("architecture enforcement contracts", () => {
  it("parses versioned strict rule, root, finding, exception, baseline, and config contracts", () => {
    expect(architectureRuleSchema.parse(databaseRule)).toEqual(databaseRule);
    expect(ownershipRootSchema.parse(databaseOwnershipRoot)).toEqual(
      databaseOwnershipRoot,
    );
    expect(architectureFindingSchema.parse(databaseFinding)).toEqual(
      databaseFinding,
    );

    expect(exactExceptionSchema.parse(databaseException)).toEqual(
      databaseException,
    );

    const baseline = {
      schemaVersion: 1,
      ruleId: "DATABASE_BOUNDARY",
      domain: "database",
      sourcePath: databaseFinding.sourcePath,
      line: databaseFinding.line,
      column: databaseFinding.column,
      evidenceKind: databaseFinding.evidenceKind,
      importSpecifier: databaseFinding.importSpecifier,
      resolvedTarget: databaseFinding.resolvedTarget,
      semanticKey: databaseFinding.semanticKey,
      instanceKey: databaseFinding.instanceKey,
      owner: "marketing-platform",
      rationale: "Reviewed legacy route pending domain migration.",
    } as const;
    expect(baselineEntrySchema.parse(baseline)).toEqual(baseline);

    const baselineFile = {
      schemaVersion: 1,
      domain: "database",
      rulesetHash: "c".repeat(64),
      entries: [baseline],
    } as const;
    expect(architectureBaselineSchema.parse(baselineFile)).toEqual(
      baselineFile,
    );

    expect(architectureConfigSchema.parse(validConfig)).toEqual(validConfig);
  });

  it.each([
    "packages/*/src/",
    "packages/**/src/",
    "/packages/db/src/",
    "packages/db/../auth/",
    "packages\\db\\src\\",
    "packages/db/src",
  ])("rejects non-exact ownership root %s", (path) => {
    expect(() =>
      ownershipRootSchema.parse({ ...databaseOwnershipRoot, path }),
    ).toThrow();
  });

  it.each([
    "apps/*/fixture.ts",
    "apps/**/fixture.ts",
    "/apps/marketing/fixture.ts",
    "apps/marketing/../sales/fixture.ts",
    "apps\\marketing\\fixture.ts",
    "apps/marketing/",
  ])("rejects non-exact exception source path %s", (sourcePath) => {
    expect(() =>
      exactExceptionSchema.parse({
        schemaVersion: 1,
        id: "database-test-fixture",
        ruleId: "DATABASE_BOUNDARY",
        sourcePath,
        owner: "architecture-platform",
        rationale: "Synthetic exact exception.",
      }),
    ).toThrow();
  });

  it("rejects unversioned, future-version, malformed, and unknown contract fields", () => {
    expect(() =>
      architectureRuleSchema.parse({ ...databaseRule, schemaVersion: 2 }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        id: "database-boundary",
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({ ...databaseRule, wildcard: true }),
    ).toThrow();
    expect(() => {
      const { schemaVersion: _schemaVersion, ...unversioned } = databaseRule;
      architectureRuleSchema.parse(unversioned);
    }).toThrow();
  });

  it("requires accountable owners and meaningful rationales", () => {
    expect(() =>
      ownershipRootSchema.parse({ ...databaseOwnershipRoot, owner: "" }),
    ).toThrow();
    expect(() =>
      ownershipRootSchema.parse({
        ...databaseOwnershipRoot,
        rationale: "legacy",
      }),
    ).toThrow();
    expect(() =>
      baselineEntrySchema.parse({
        ...databaseFinding,
        owner: "",
        rationale: "Reviewed legacy route pending domain migration.",
      }),
    ).toThrow();
  });

  it("rejects duplicate rule, ownership-root, and exact-exception identifiers", () => {
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        rules: [databaseRule, databaseRule],
      }),
    ).toThrow();
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        ownershipRoots: [databaseOwnershipRoot, databaseOwnershipRoot],
      }),
    ).toThrow();
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        exactExceptions: [databaseException, databaseException],
      }),
    ).toThrow();
  });

  it("rejects duplicate rule references and unresolved configuration references", () => {
    expect(() =>
      ownershipRootSchema.parse({
        ...databaseOwnershipRoot,
        ruleIds: ["DATABASE_BOUNDARY", "DATABASE_BOUNDARY"],
      }),
    ).toThrow();
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        rules: [{ ...databaseRule, ownershipRootIds: ["missing-root"] }],
      }),
    ).toThrow();
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        ownershipRoots: [
          { ...databaseOwnershipRoot, ruleIds: ["UNKNOWN_RULE"] },
        ],
      }),
    ).toThrow();
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        exactExceptions: [{ ...databaseException, ruleId: "UNKNOWN_RULE" }],
      }),
    ).toThrow();
  });

  it("rejects vacuous rule selectors and duplicate selector values", () => {
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        moduleMatchers: [],
        resourceMatchers: [],
        resolvedTargetRoots: [],
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        findingKinds: ["static-import", "static-import"],
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        moduleMatchers: [
          databaseRule.moduleMatchers[0],
          databaseRule.moduleMatchers[0],
        ],
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        resourceMatchers: [
          databaseRule.resourceMatchers[0],
          databaseRule.resourceMatchers[0],
        ],
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        resourceMatchers: [{ kind: "prefix", value: "environment:OPENAI_*" }],
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        resolvedTargetRoots: ["packages/db/src/", "packages/db/src/"],
      }),
    ).toThrow();
    expect(() =>
      architectureRuleSchema.parse({
        ...databaseRule,
        ownershipRootIds: ["database-package", "database-package"],
      }),
    ).toThrow();
  });

  it("limits exact exceptions to exact test and fixture files", () => {
    expect(() =>
      exactExceptionSchema.parse({
        ...databaseException,
        sourcePath: "packages/ai/src/internal-sdk.ts",
      }),
    ).toThrow();
    expect(() =>
      exactExceptionSchema.parse({
        ...databaseException,
        sourcePath: "packages/storage/src/__tests__/provider.ts",
      }),
    ).not.toThrow();
    expect(() =>
      exactExceptionSchema.parse({
        ...databaseException,
        sourcePath: "packages/storage/src/fixtures/provider.ts",
      }),
    ).not.toThrow();
  });

  it("rejects mismatched ownership domains and one-sided rule/root references", () => {
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        ownershipRoots: [{ ...databaseOwnershipRoot, domain: "provider" }],
      }),
    ).toThrow();

    const unreferencedRoot = {
      ...databaseOwnershipRoot,
      id: "unreferenced-root",
      path: "packages/domain/src/",
    } as const;
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        ownershipRoots: [databaseOwnershipRoot, unreferencedRoot],
      }),
    ).toThrow();

    const oneSidedRule = {
      ...databaseRule,
      id: "OTHER_DATABASE_BOUNDARY",
    } as const;
    expect(() =>
      architectureConfigSchema.parse({
        ...validConfig,
        rules: [databaseRule, oneSidedRule],
      }),
    ).toThrow();
  });

  it("rejects findings that lack a precise source location or resolved target", () => {
    expect(() =>
      architectureFindingSchema.parse({ ...databaseFinding, line: 0 }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        resolvedTarget: "",
      }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        sourcePath: "../outside.ts",
      }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        semanticKey: "not-a-sha256",
      }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        sourceBody: "const password = 'must-not-enter-diagnostics';",
      }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        importSpecifier: "/home/operator/private-module.ts",
      }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        importSpecifier: "safe-module\nsecret-value",
      }),
    ).toThrow();
    expect(() =>
      architectureFindingSchema.parse({
        ...databaseFinding,
        resolvedTarget: "/home/operator/repository/file.ts",
      }),
    ).toThrow();
  });

  it.each(["\n", "\r", "\0", "\u007f"])(
    "rejects control character %j in source and resolved paths",
    (controlCharacter) => {
      expect(() =>
        architectureFindingSchema.parse({
          ...databaseFinding,
          sourcePath: `apps/example/route.ts${controlCharacter}secret=value`,
        }),
      ).toThrow();
      expect(() =>
        architectureFindingSchema.parse({
          ...databaseFinding,
          resolvedTarget: `packages/db/src/index.ts${controlCharacter}secret=value`,
        }),
      ).toThrow();
    },
  );

  it("requires baseline entries to be sorted and unique by instance key", () => {
    const entry = {
      ...databaseFinding,
      owner: "marketing-platform",
      rationale: "Reviewed legacy route pending domain migration.",
    } as const;
    const laterEntry = {
      ...entry,
      sourcePath: "apps/sales/app/api/example/route.ts",
      semanticKey: "c".repeat(64),
      instanceKey: "d".repeat(64),
    } as const;

    expect(() =>
      architectureBaselineSchema.parse({
        schemaVersion: 1,
        domain: "database",
        rulesetHash: "e".repeat(64),
        entries: [laterEntry, entry],
      }),
    ).toThrow();
    expect(() =>
      architectureBaselineSchema.parse({
        schemaVersion: 1,
        domain: "database",
        rulesetHash: "e".repeat(64),
        entries: [entry, entry],
      }),
    ).toThrow();
    expect(() =>
      architectureBaselineSchema.parse({
        schemaVersion: 1,
        domain: "provider",
        rulesetHash: "e".repeat(64),
        entries: [entry],
      }),
    ).toThrow();
  });
});
