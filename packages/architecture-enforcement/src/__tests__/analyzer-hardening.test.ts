import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { analyzeArchitectureSources } from "../analyzer.js";
import type { ArchitectureConfig } from "../contracts.js";
import { loadOwnershipMap } from "../ownership-map.js";
import { analyzerHardeningInputs } from "./fixtures/analyzer-hardening-inputs.js";

const temporaryRoots: string[] = [];
const ARCHITECTURE_TEST_ROOT = "/tmp/opencode/architecture-v2-red";

/** Returns the one approved temporary root for architecture tests.
 * @returns Approved architecture test root.
 */
function getArchitectureTestRoot(): string {
  const configuredRoot = process.env.ARCHITECTURE_TEST_TMPDIR;
  if (
    configuredRoot !== undefined &&
    configuredRoot !== ARCHITECTURE_TEST_ROOT
  ) {
    throw new Error(
      `ARCHITECTURE_TEST_TMPDIR must equal ${ARCHITECTURE_TEST_ROOT}`,
    );
  }
  return ARCHITECTURE_TEST_ROOT;
}

/** Creates an isolated source root for exact analyzer hardening tests.
 * @returns Temporary source root.
 */
async function createTemporaryRoot(): Promise<string> {
  const baseDirectory = getArchitectureTestRoot();
  await mkdir(baseDirectory, { recursive: true });
  const root = await mkdtemp(resolve(baseDirectory, "architecture-hardening-"));
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
    const { sourcePath, source } = analyzerHardeningInputs.directOrigins;
    await mkdir(resolve(repoRoot, "apps/example/src"), { recursive: true });
    await writeFile(resolve(repoRoot, sourcePath), source, "utf8");
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
      policyVersion: "v1",
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
    const { sourcePaths, sources } = analyzerHardeningInputs.durableAccess;
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
      policyVersion: "v2",
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
    expect(
      durableJobFindings.filter(
        (finding) =>
          finding.sourcePath === sourcePaths.clientConstruction &&
          finding.evidenceKind === "client-construction" &&
          finding.resource === "database-table:durable_jobs",
      ),
    ).toHaveLength(0);
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
    expect(
      durableJobFindings.filter(
        (finding) =>
          finding.sourcePath === sourcePaths.shadowed &&
          finding.evidenceKind === "static-import" &&
          finding.resource === "database-table:durable_jobs",
      ),
    ).toHaveLength(0);
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
      ).toHaveLength(0);
    }
  });
});
