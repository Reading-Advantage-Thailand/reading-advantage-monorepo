import { execFileSync, spawnSync } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  createArchitectureBaseline,
  serializeArchitectureBaseline,
} from "../baseline.js";
import { validateCommittedBaselines } from "../baseline-validation.js";
import type { DirectViolationCandidate } from "../inventory.js";
import { loadOwnershipMap } from "../ownership-map.js";

const temporaryRoots: string[] = [];
const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));

/**
 * Creates an isolated tracked-source repository for baseline gate tests.
 * @param sourcePath Repository-relative TypeScript source path.
 * @param source TypeScript source body written to the tracked path.
 * @returns Absolute temporary git repository root.
 */
async function createTemporaryRepository(
  sourcePath: string,
  source: string,
): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "architecture-baseline-"));
  temporaryRoots.push(root);
  await mkdir(dirname(resolve(root, sourcePath)), { recursive: true });
  await writeFile(resolve(root, sourcePath), source, "utf8");
  execFileSync("git", ["init", "--quiet"], { cwd: root });
  execFileSync("git", ["add", "--", sourcePath], { cwd: root });
  return root;
}

/**
 * Writes strict database and provider baselines into a temporary repository.
 * @param root Absolute temporary repository root.
 * @param databaseCandidates Reviewed database candidates expected from inventory.
 * @returns Nothing after both configured baseline files are written.
 */
async function writeBaselines(
  root: string,
  databaseCandidates: readonly DirectViolationCandidate[],
): Promise<void> {
  const config = loadOwnershipMap();
  for (const [domain, candidates] of [
    ["database", databaseCandidates],
    ["provider", []],
  ] as const) {
    const path = config.baselineFiles[domain];
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(
      resolve(root, path),
      serializeArchitectureBaseline(
        createArchitectureBaseline(candidates, config, domain),
      ),
      "utf8",
    );
  }
}

afterEach(async () => {
  await Promise.all(
    temporaryRoots
      .splice(0)
      .map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("committed architecture baseline validation", () => {
  it("wires tracked inventory through both expected domain baseline files", async () => {
    const sourcePath = "apps/gate/src/database.ts";
    const root = await createTemporaryRepository(
      sourcePath,
      'import postgres from "postgres";\nvoid postgres;\n',
    );
    await writeBaselines(root, [
      {
        schemaVersion: 1,
        ruleId: "DATABASE_BOUNDARY",
        domain: "database",
        sourcePath,
        line: 1,
        column: 1,
        evidenceKind: "static-import",
        importSpecifier: "postgres",
        owner: "gate-platform",
        rationale:
          "Reviewed direct database match selected by DATABASE_BOUNDARY; migrate it into an approved ownership root.",
        proposedDisposition: "baseline-review",
      },
    ]);

    await expect(validateCommittedBaselines(root)).resolves.toMatchObject({
      schemaVersion: 1,
      filesScanned: 1,
      databaseEntries: 1,
      providerEntries: 0,
    });

    const config = loadOwnershipMap();
    const provider = await readFile(
      resolve(root, config.baselineFiles.provider),
      "utf8",
    );
    await writeFile(
      resolve(root, config.baselineFiles.database),
      provider,
      "utf8",
    );
    await expect(validateCommittedBaselines(root)).rejects.toThrow(
      /expected database baseline/i,
    );
  }, 30_000);

  it("fails closed before baseline reads when tracked source cannot parse", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/broken.ts",
      "import {",
    );

    await expect(validateCommittedBaselines(root)).rejects.toThrow(
      /parse errors/i,
    );
  }, 30_000);

  it("fails closed when an exact test exception has not been reviewed", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/database.test.ts",
      'import postgres from "postgres";\nvoid postgres;\n',
    );

    await expect(validateCommittedBaselines(root)).rejects.toThrow(
      /exact test or fixture exceptions remain unreviewed/i,
    );
  }, 30_000);

  it("makes the executable CLI return non-zero when baseline files are missing", async () => {
    const root = await createTemporaryRepository(
      "apps/gate/src/clean.ts",
      "export const clean = true;\n",
    );
    const result = spawnSync(
      resolve(repositoryRoot, "node_modules/.bin/tsx"),
      [resolve(packageRoot, "src/baseline-cli.ts"), "--repo-root", root],
      { cwd: packageRoot, encoding: "utf8", timeout: 30_000 },
    );

    expect(result.status).toBe(1);
    expect(result.stderr).toMatch(/architecture baseline validation failed/i);
  }, 30_000);
});
