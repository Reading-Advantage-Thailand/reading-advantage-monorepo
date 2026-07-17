import { execFileSync } from "node:child_process";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  checkArchitectureRepository,
  formatArchitectureCheckReport,
  readArchitectureBaselines,
} from "../architecture-check.js";
import { computeRulesetHash } from "../baseline.js";
import type {
  ArchitectureBaseline,
  ArchitectureConfig,
} from "../contracts.js";
import { loadOwnershipMap } from "../ownership-map.js";

const temporaryRoots: string[] = [];

/** Creates a Git-backed temporary repository with current empty baselines. */
async function createCheckerRepository(): Promise<{
  config: ArchitectureConfig;
  repoRoot: string;
}> {
  const repoRoot = await mkdtemp(resolve(tmpdir(), "architecture-check-cover-"));
  temporaryRoots.push(repoRoot);
  const config = loadOwnershipMap();
  for (const domain of ["database", "provider"] as const) {
    const path = resolve(repoRoot, config.baselineFiles[domain]);
    await mkdir(resolve(path, ".."), { recursive: true });
    const baseline: ArchitectureBaseline = {
      schemaVersion: 1,
      domain,
      rulesetHash: computeRulesetHash(config, domain),
      entries: [],
    };
    await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  }
  execFileSync("git", ["init", "--quiet"], { cwd: repoRoot });
  return { config, repoRoot };
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("architecture checker branch coverage", () => {
  it("uses default policy, tracked-source selection, and workspace discovery", async () => {
    const { repoRoot } = await createCheckerRepository();
    await mkdir(resolve(repoRoot, "apps"), { recursive: true });
    await writeFile(
      resolve(repoRoot, "apps/safe.ts"),
      "export const safe = true;\n",
      "utf8",
    );
    execFileSync("git", ["add", "apps/safe.ts"], { cwd: repoRoot });

    const result = await checkArchitectureRepository({ repoRoot });

    expect(result).toMatchObject({
      status: "clean",
      filesScanned: 1,
      findings: [],
      parseErrors: [],
    });
  });

  it("rejects a stale baseline ruleset hash", async () => {
    const { config, repoRoot } = await createCheckerRepository();
    const stale: ArchitectureBaseline = {
      schemaVersion: 1,
      domain: "database",
      rulesetHash: "f".repeat(64),
      entries: [],
    };
    await writeFile(
      resolve(repoRoot, config.baselineFiles.database),
      `${JSON.stringify(stale, null, 2)}\n`,
      "utf8",
    );

    await expect(readArchitectureBaselines(repoRoot, config)).rejects.toThrow(
      /ruleset hash does not match current policy/,
    );
  });

  it("passes resolver config and stably sorts multiple analyzer errors", async () => {
    const { config, repoRoot } = await createCheckerRepository();
    await mkdir(resolve(repoRoot, "apps"), { recursive: true });
    await writeFile(
      resolve(repoRoot, "apps/broken.ts"),
      [
        'import "./missing-z";',
        'import "./missing-a"; import "./missing-b";',
      ].join("\n"),
      "utf8",
    );
    await writeFile(
      resolve(repoRoot, "tsconfig.json"),
      `${JSON.stringify({ compilerOptions: { baseUrl: "." } })}\n`,
      "utf8",
    );

    const result = await checkArchitectureRepository({
      repoRoot,
      config,
      sourcePaths: ["apps/broken.ts"],
      workspaceTargets: new Map(),
      resolverConfigPath: "tsconfig.json",
    });

    expect(result.status).toBe("analysis-error");
    expect(result.parseErrors.map((error) => [error.line, error.column])).toEqual(
      [
        [1, 1],
        [2, 1],
        [2, 23],
      ],
    );
    const human = formatArchitectureCheckReport(result);
    expect(human.match(/MODULE_RESOLUTION_ERROR/g)).toHaveLength(3);
    expect(human).not.toContain("missing-z");
  });
});
