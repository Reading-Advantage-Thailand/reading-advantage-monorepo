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
});
