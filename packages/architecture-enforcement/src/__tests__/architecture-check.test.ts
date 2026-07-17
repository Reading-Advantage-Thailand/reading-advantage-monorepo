import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  architectureCheckExitCode,
  checkArchitectureRepository,
  formatArchitectureCheckReport,
  serializeArchitectureCheckReport,
  type ArchitectureCheckReport,
} from "../architecture-check.js";
import { computeRulesetHash } from "../baseline.js";
import type {
  ArchitectureBaseline,
  ArchitectureConfig,
  ArchitectureFinding,
} from "../contracts.js";
import { loadOwnershipMap } from "../ownership-map.js";
import { compareArchitectureDebt } from "../ratchet.js";

const hash = (character: string): string => character.repeat(64);
const fixtureRoots: string[] = [];

afterEach(async () => {
  await Promise.all(
    fixtureRoots
      .splice(0)
      .map((fixtureRoot) => rm(fixtureRoot, { recursive: true, force: true })),
  );
});

/** Creates one valid finding for deterministic checker-report tests. */
function finding(): ArchitectureFinding {
  return {
    schemaVersion: 1,
    ruleId: "DATABASE_BOUNDARY",
    domain: "database",
    sourcePath: "apps/sales/src/database.ts",
    line: 4,
    column: 2,
    evidenceKind: "static-import",
    importSpecifier: "@reading-advantage/db",
    resolvedTarget: "packages/db/src/index.ts",
    semanticKey: hash("a"),
    instanceKey: hash("1"),
  };
}

/** Creates a minimal valid database and provider baseline pair. */
function emptyBaselines() {
  return {
    database: {
      schemaVersion: 1 as const,
      domain: "database" as const,
      rulesetHash: hash("d"),
      entries: [],
    },
    provider: {
      schemaVersion: 1 as const,
      domain: "provider" as const,
      rulesetHash: hash("e"),
      entries: [],
    },
  };
}

interface LiveCheckerFixture {
  baselineContents: ReadonlyMap<string, string>;
  config: ArchitectureConfig;
  repoRoot: string;
  sourcePath: string;
}

/**
 * Creates a real temporary checker surface with validated empty baselines.
 * @returns Isolated repository, policy, source, and original baseline bytes.
 */
async function createLiveCheckerFixture(): Promise<LiveCheckerFixture> {
  const repoRoot = await mkdtemp(join(tmpdir(), "architecture-check-"));
  fixtureRoots.push(repoRoot);
  const sourcePath = "apps/sample.ts";
  const config: ArchitectureConfig = {
    ...loadOwnershipMap(),
    baselineFiles: {
      database: "config/baselines/database.json",
      provider: "config/baselines/provider.json",
    },
  };
  await mkdir(resolve(repoRoot, "apps"), { recursive: true });
  await mkdir(resolve(repoRoot, "config/baselines"), { recursive: true });
  await writeFile(
    resolve(repoRoot, sourcePath),
    'import OpenAI from "openai";\nvoid OpenAI;\n',
    "utf8",
  );
  const baselineContents = new Map<string, string>();
  for (const domain of ["database", "provider"] as const) {
    const baseline: ArchitectureBaseline = {
      schemaVersion: 1,
      domain,
      rulesetHash: computeRulesetHash(config, domain),
      entries: [],
    };
    const contents = `${JSON.stringify(baseline, null, 2)}\n`;
    const path = config.baselineFiles[domain];
    baselineContents.set(path, contents);
    await writeFile(resolve(repoRoot, path), contents, "utf8");
  }
  return { baselineContents, config, repoRoot, sourcePath };
}

describe("architecture checker reports", () => {
  it("maps clean, debt-change, and analyzer failures to exit codes 0, 1, and 2", () => {
    const cleanComparison = compareArchitectureDebt({
      baselines: emptyBaselines(),
      findings: [],
    });
    const clean: ArchitectureCheckReport = {
      schemaVersion: 1,
      status: "clean",
      filesScanned: 4,
      findings: [],
      parseErrors: [],
      comparison: cleanComparison,
    };
    const debt: ArchitectureCheckReport = {
      schemaVersion: 1,
      status: "debt-change",
      filesScanned: 4,
      findings: [finding()],
      parseErrors: [],
      comparison: compareArchitectureDebt({
        baselines: emptyBaselines(),
        findings: [finding()],
      }),
    };
    const failed: ArchitectureCheckReport = {
      schemaVersion: 1,
      status: "analysis-error",
      filesScanned: 4,
      findings: [],
      parseErrors: [
        {
          schemaVersion: 1,
          sourcePath: "apps/sales/src/broken.ts",
          line: 2,
          column: 3,
          code: "TYPESCRIPT_PARSE_ERROR",
        },
      ],
    };

    expect(architectureCheckExitCode(clean)).toBe(0);
    expect(architectureCheckExitCode(debt)).toBe(1);
    expect(architectureCheckExitCode(failed)).toBe(2);
  });

  it("serializes byte-identically and emits concise secret-safe human diagnostics", () => {
    const report: ArchitectureCheckReport = {
      schemaVersion: 1,
      status: "debt-change",
      filesScanned: 1,
      findings: [finding()],
      parseErrors: [],
      comparison: compareArchitectureDebt({
        baselines: emptyBaselines(),
        findings: [finding()],
      }),
    };

    const json = serializeArchitectureCheckReport(report);
    const human = formatArchitectureCheckReport(report);

    expect(serializeArchitectureCheckReport(report)).toBe(json);
    expect(json.endsWith("\n")).toBe(true);
    expect(human).toContain("architecture check: debt-change");
    expect(human).toContain("new-debt");
    expect(human).toContain("DATABASE_BOUNDARY");
    expect(human).not.toContain("rationale");
    expect(human).not.toContain("source body");
  });

  it("checks a live repository read-only and fails closed for parser and config errors", async () => {
    const fixture = await createLiveCheckerFixture();
    const options = {
      repoRoot: fixture.repoRoot,
      config: fixture.config,
      sourcePaths: [fixture.sourcePath],
      workspaceTargets: new Map<string, string>(),
    };

    const debtReport = await checkArchitectureRepository(options);
    expect(debtReport.status).toBe("debt-change");
    expect(
      debtReport.findings.some((entry) => entry.domain === "provider"),
    ).toBe(true);
    for (const [path, contents] of fixture.baselineContents) {
      await expect(
        readFile(resolve(fixture.repoRoot, path), "utf8"),
      ).resolves.toBe(contents);
    }

    await writeFile(
      resolve(fixture.repoRoot, fixture.sourcePath),
      "const invalid = ;\n",
      "utf8",
    );
    const parserReport = await checkArchitectureRepository(options);
    expect(parserReport.status).toBe("analysis-error");
    expect(parserReport.parseErrors).not.toHaveLength(0);

    const invalidConfig = {
      ...fixture.config,
      schemaVersion: 2,
    } as unknown as ArchitectureConfig;
    await expect(
      checkArchitectureRepository({ ...options, config: invalidConfig }),
    ).rejects.toThrow();
  });
});
