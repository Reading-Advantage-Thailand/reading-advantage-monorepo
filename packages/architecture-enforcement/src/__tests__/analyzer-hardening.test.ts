import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeArchitectureSources } from "../analyzer.js";
import type { ArchitectureConfig } from "../contracts.js";
import { loadOwnershipMap } from "../ownership-map.js";

const temporaryRoots: string[] = [];

/** Creates an isolated source root for exact analyzer hardening tests. */
async function createTemporaryRoot(): Promise<string> {
  const root = await mkdtemp(resolve(tmpdir(), "architecture-hardening-"));
  temporaryRoots.push(root);
  return root;
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("architecture analyzer evidence hardening", () => {
  it("preserves distinct module and resource origins selected by one rule", async () => {
    const repoRoot = await createTemporaryRoot();
    const sourcePath = "apps/example/src/direct.ts";
    await mkdir(resolve(repoRoot, "apps/example/src"), { recursive: true });
    await writeFile(
      resolve(repoRoot, sourcePath),
      [
        "/** Exact non-default source location for lookup validation. */",
        "",
        '  import { db, reviewJobs } from "@reading-advantage/db";',
        "export const secretSafeReference = [db, reviewJobs];",
      ].join("\n"),
      "utf8",
    );
    const base = loadOwnershipMap();
    const config: ArchitectureConfig = {
      ...base,
      rules: base.rules.map((rule) =>
        rule.id === "DATABASE_BOUNDARY"
          ? {
              ...rule,
              resourceMatchers: [
                ...rule.resourceMatchers,
                { kind: "exact" as const, value: "database-table:review_jobs" },
              ],
            }
          : rule,
      ),
    };

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: [sourcePath],
      workspaceTargets: new Map(),
      config,
    });

    expect(result.parseErrors).toEqual([]);
    const findings = result.findings.filter(
      (finding) =>
        finding.ruleId === "DATABASE_BOUNDARY" &&
        finding.evidenceKind === "static-import",
    );
    expect(findings).toHaveLength(2);
    expect(findings.map((finding) => finding.resolvedTarget).sort()).toEqual([
      "external:@reading-advantage/db",
      "external:database-table",
    ]);
    expect(findings).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          line: 3,
          column: 3,
          resource: "database-table:review_jobs",
        }),
      ]),
    );
    expect(JSON.stringify(result)).not.toContain("secretSafeReference");
  });

  it("enforces durable access forms outside the adapter and allows adapter SQL", async () => {
    const repoRoot = await createTemporaryRoot();
    const sourcePaths = {
      namespace: "packages/backend/src/jobs/namespace-durable-query.ts",
      dynamic: "packages/backend/src/jobs/dynamic-durable-query.ts",
      commonjs: "packages/backend/src/jobs/commonjs-durable-query.ts",
      reexport: "packages/backend/src/jobs/reexport-durable-query.ts",
      clientConstruction:
        "packages/backend/src/jobs/client-construction-durable.ts",
      rawSql: "packages/backend/src/jobs/raw-durable-query.ts",
      adapterRawSql:
        "packages/backend/src/jobs/adapters/postgres/raw-durable-query.ts",
      literalConst: "packages/backend/src/jobs/literal-const-durable-query.ts",
      literalConcat:
        "packages/backend/src/jobs/literal-concat-durable-query.ts",
      sqlMention: "packages/backend/src/jobs/sql-mention-durable-query.ts",
      shadowed: "packages/backend/src/jobs/shadowed-durable-query.ts",
      reexportSupport: "packages/backend/src/jobs/durable-reexports.ts",
    } as const;
    const sources: Record<string, string> = {
      [sourcePaths.namespace]: [
        'import * as database from "@reading-advantage/db";',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const namespaceAccess = query.select().from(database.durableJobs);",
      ].join("\n"),
      [sourcePaths.dynamic]: [
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export async function dynamicAccess() {",
        '  const database = await import("@reading-advantage/db");',
        "  return query.select().from(database.durableJobs);",
        "}",
      ].join("\n"),
      [sourcePaths.commonjs]: [
        'const database = require("@reading-advantage/db");',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const commonjsAccess = query.select().from(database.durableJobs);",
      ].join("\n"),
      [sourcePaths.reexport]: [
        'import { durableJobs } from "./durable-reexports.js";',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const reexportAccess = query.select().from(durableJobs);",
      ].join("\n"),
      [sourcePaths.clientConstruction]: [
        'import { durableJobs } from "@reading-advantage/db";',
        "class SyntheticDurableClient {",
        "  constructor(readonly table: unknown) {}",
        "}",
        "export const clientConstructionAccess = new SyntheticDurableClient(durableJobs);",
      ].join("\n"),
      [sourcePaths.rawSql]: [
        'import postgres from "postgres";',
        "const client = postgres();",
        'export const rawSqlAccess = client.unsafe(`SELECT * FROM "durable_jobs" JOIN "review_jobs" ON true`);',
      ].join("\n"),
      [sourcePaths.adapterRawSql]: [
        'import postgres from "postgres";',
        "const client = postgres();",
        'export const adapterRawSqlAccess = client.unsafe(`SELECT * FROM "durable_jobs" JOIN "review_jobs" ON true`);',
      ].join("\n"),
      [sourcePaths.literalConst]: [
        'import postgres from "postgres";',
        "const client = postgres();",
        'const sql = `SELECT * FROM "durable_jobs" JOIN "review_jobs" ON true`;',
        "export const literalConstAccess = client.unsafe(sql);",
      ].join("\n"),
      [sourcePaths.literalConcat]: [
        'import postgres from "postgres";',
        "const client = postgres();",
        'const sql = "SELECT * FROM " +\n          \'"durable_jobs" JOIN "review_jobs" ON true\';',
        "export const literalConcatAccess = client.unsafe(sql);",
      ].join("\n"),
      [sourcePaths.sqlMention]: [
        'import postgres from "postgres";',
        "const client = postgres();",
        'export const commentMention = client.unsafe("SELECT 1 /* durable_jobs review_jobs */");',
        "export const valueMention = client.unsafe(\"SELECT 'durable_jobs' AS durable, 'review_jobs' AS review\");",
      ].join("\n"),
      [sourcePaths.shadowed]: [
        'import { durableJobs } from "@reading-advantage/db";',
        "const query = {",
        "  select: () => ({ from: (table: unknown) => table }),",
        "};",
        "export const shadowedAccess = (durableJobs: unknown) =>",
        "  query.select().from(durableJobs);",
      ].join("\n"),
      [sourcePaths.reexportSupport]:
        'export { durableJobs } from "@reading-advantage/db";',
    };
    await mkdir(resolve(repoRoot, "packages/backend/src/jobs"), {
      recursive: true,
    });
    await mkdir(
      resolve(repoRoot, "packages/backend/src/jobs/adapters/postgres"),
      {
        recursive: true,
      },
    );
    for (const [sourcePath, source] of Object.entries(sources)) {
      await writeFile(resolve(repoRoot, sourcePath), source, "utf8");
    }

    const result = await analyzeArchitectureSources({
      repoRoot,
      sourcePaths: Object.keys(sources),
      workspaceTargets: new Map(),
      config: loadOwnershipMap(),
    });

    expect(result.parseErrors).toEqual([]);
    const durableJobFindings = result.findings.filter(
      (finding) => finding.ruleId === "DURABLE_JOB_DATABASE_BOUNDARY",
    );
    expect(
      durableJobFindings.filter(
        (finding) => finding.sourcePath === sourcePaths.adapterRawSql,
      ),
    ).toEqual([]);
    const expectedDurableFindings: Array<{
      sourcePath: string;
      evidenceKind: string;
      resource: string;
    }> = [
      sourcePaths.namespace,
      sourcePaths.dynamic,
      sourcePaths.commonjs,
      sourcePaths.reexport,
      sourcePaths.rawSql,
    ].map((sourcePath) => ({
      sourcePath,
      evidenceKind: "query-call",
      resource: "database-table:durable_jobs",
    }));
    expectedDurableFindings.push({
      sourcePath: sourcePaths.clientConstruction,
      evidenceKind: "client-construction",
      resource: "database-table:durable_jobs",
    });
    expect(durableJobFindings).toEqual(
      expect.arrayContaining(
        expectedDurableFindings.map((finding) =>
          expect.objectContaining(finding),
        ),
      ),
    );
    expect(
      durableJobFindings.filter(
        (finding) =>
          finding.sourcePath === sourcePaths.clientConstruction &&
          finding.evidenceKind === "client-construction" &&
          finding.resource === "database-table:durable_jobs",
      ),
    ).toHaveLength(1);
    expect(
      durableJobFindings.filter(
        (finding) => finding.sourcePath === sourcePaths.rawSql,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          evidenceKind: "query-call",
          resource: "database-table:review_jobs",
        }),
      ]),
    );

    for (const sourcePath of [
      sourcePaths.literalConst,
      sourcePaths.literalConcat,
    ]) {
      expect
        .soft(
          durableJobFindings.filter(
            (finding) => finding.sourcePath === sourcePath,
          ),
        )
        .toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              evidenceKind: "query-call",
              resource: "database-table:durable_jobs",
            }),
            expect.objectContaining({
              evidenceKind: "query-call",
              resource: "database-table:review_jobs",
            }),
          ]),
        );
    }

    expect
      .soft(
        durableJobFindings.filter(
          (finding) => finding.sourcePath === sourcePaths.sqlMention,
        ),
      )
      .toEqual([]);
    expect
      .soft(
        durableJobFindings.filter(
          (finding) =>
            finding.sourcePath === sourcePaths.shadowed &&
            finding.evidenceKind === "static-import" &&
            finding.resource === "database-table:durable_jobs",
        ),
      )
      .toHaveLength(1);
    expect
      .soft(
        durableJobFindings.filter(
          (finding) =>
            finding.sourcePath === sourcePaths.shadowed &&
            finding.evidenceKind === "query-call",
        ),
      )
      .toEqual([]);

    for (const sourcePath of [
      sourcePaths.namespace,
      sourcePaths.dynamic,
      sourcePaths.commonjs,
    ]) {
      expect(
        durableJobFindings.filter(
          (finding) =>
            finding.sourcePath === sourcePath &&
            finding.evidenceKind === "query-call" &&
            finding.resource === "database-table:durable_jobs",
        ),
      ).toHaveLength(1);
    }
  });
});
