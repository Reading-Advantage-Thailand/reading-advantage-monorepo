import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { ArchitectureCheckReport } from "../architecture-check.js";
import {
  mainArchitectureCheckCli,
  parseArchitectureCheckArguments,
  runArchitectureCheckCli,
} from "../architecture-check-cli.js";
import {
  computeAnalyzerImplementationTreeSha256V2Sync,
  computeReconciliationImplementationTreeSha256V2Sync,
} from "../reconciliation-manifest.js";
import {
  computeAnalyzerInputSnapshotSha256Sync,
  computeAnalyzerReportSha256,
  selectV2AnalyzerSourcePaths,
  validateAnalyzerReconciliationManifestV2,
  validateAnalyzerReconciliationManifestV2Sync,
  type ValidateAnalyzerReconciliationManifestV2Input,
} from "../v2-manifest-validation.js";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const REFRESH_CLI_PATH =
  "packages/architecture-enforcement/src/architecture-pin-refresh-cli.ts";
const TSX_PATH = resolve(repositoryRoot, "node_modules/.bin/tsx");
const PIN_ERROR = "Analyzer input snapshot hash does not match current bytes";
const REPORT_ERROR =
  "Analyzer report hashes do not match current byte-identical reports";
const IMPLEMENTATION_TREE_ERROR =
  "Analyzer implementation tree hash does not match current bytes";
const IMPLEMENTATION_AND_TEST_TREE_ERROR =
  "Implementation and test tree hash does not match current bytes";
const WRONG_HASH = "0123456789abcdef".repeat(4);
const FIXTURE_TIMEOUT_MS = 120_000;

const temporaryRoots: string[] = [];

/** One temporary fixture repository and its committed manifest. */
interface Fixture {
  root: string;
  manifest: Record<string, unknown>;
}

/** One refresh command run and its captured result. */
interface RefreshRun {
  status: number | null;
  output: string;
}

/** Serializes JSON data with stable object-key ordering for manifest subjects. */
function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  }
  if (value !== null && typeof value === "object") {
    const record = value as Record<string, unknown>;
    return `{${Object.keys(record)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(record[key])}`)
      .join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

/** Recomputes the review subject over the protected manifest fields. */
function computeReviewSubject(manifest: Record<string, unknown>): string {
  const {
    reviews: _reviews,
    acceptance: _acceptance,
    reviewSubjectSha256: _reviewSubjectSha256,
    ...protectedFields
  } = manifest;
  return createHash("sha256")
    .update(canonicalJson(protectedFields), "utf8")
    .digest("hex");
}

/** Adds the new validator option through one narrow cast. */
function withPinOption(
  input: ValidateAnalyzerReconciliationManifestV2Input,
  validateInputSnapshotPin: boolean,
): ValidateAnalyzerReconciliationManifestV2Input {
  return {
    ...input,
    validateInputSnapshotPin,
  } as ValidateAnalyzerReconciliationManifestV2Input;
}

/** Runs one Git command inside a fixture repository. */
function runGit(root: string, args: readonly string[]): void {
  execFileSync("git", [...args], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/** Commits the staged fixture files with a fixed author. */
function commitFixture(root: string, message: string): void {
  runGit(root, [
    "-c",
    "user.email=architecture@example.com",
    "-c",
    "user.name=Architecture Tests",
    "commit",
    "--quiet",
    "-m",
    message,
  ]);
}

/** Reads and parses the committed v2 manifest of a fixture repository. */
async function readManifest(root: string): Promise<Record<string, unknown>> {
  return JSON.parse(
    await readFile(resolve(root, V2_MANIFEST_PATH), "utf8"),
  ) as Record<string, unknown>;
}

/** Writes the canonical pretty manifest bytes with one trailing newline. */
async function writeManifest(
  root: string,
  manifest: Record<string, unknown>,
): Promise<void> {
  await writeFile(
    resolve(root, V2_MANIFEST_PATH),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );
}

/** Creates the base fixture repository with a valid committed manifest. */
async function createBaseFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "architecture-ci-pin-base-"));
  temporaryRoots.push(root);
  await cp(resolve(packageRoot, "src"), resolve(root, "packages/architecture-enforcement/src"), {
    recursive: true,
  });
  await writeFile(
    resolve(root, "package.json"),
    `${JSON.stringify({ name: "architecture-ci-pin-fixture", private: true }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    resolve(root, "pnpm-workspace.yaml"),
    "packages:\n  - apps/*\n  - packages/*\n",
    "utf8",
  );
  await mkdir(resolve(root, "apps/example/src"), { recursive: true });
  await writeFile(
    resolve(root, "apps/example/src/clean.ts"),
    "export const clean = true;\n",
    "utf8",
  );
  runGit(root, ["init", "--quiet"]);
  runGit(root, ["add", "--", "package.json", "pnpm-workspace.yaml", "packages", "apps"]);
  commitFixture(root, "fixture base");
  const manifest = await readManifest(root);
  const reportHash = await computeAnalyzerReportSha256(root);
  const refreshed: Record<string, unknown> = {
    ...manifest,
    analyzerImplementationTreeSha256:
      computeAnalyzerImplementationTreeSha256V2Sync(root),
    implementationAndTestTreeSha256:
      computeReconciliationImplementationTreeSha256V2Sync(root),
    analyzerInputSnapshotSha256: computeAnalyzerInputSnapshotSha256Sync(
      root,
      selectV2AnalyzerSourcePaths(root),
    ),
    reportSha256s: [reportHash, reportHash],
  };
  refreshed.reviewSubjectSha256 = computeReviewSubject(refreshed);
  await writeManifest(root, refreshed);
  runGit(root, ["add", "--", V2_MANIFEST_PATH]);
  commitFixture(root, "fixture pins");
  return { root, manifest: refreshed };
}

/** Copies one fixture repository into a new temporary repository. */
async function cloneFixture(sourceRoot: string, name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `architecture-ci-pin-${name}-`));
  temporaryRoots.push(root);
  await cp(sourceRoot, root, { recursive: true });
  return root;
}

/** Breaks one manifest value and rebinds the review subject. */
async function patchManifest(
  root: string,
  patch: (manifest: Record<string, unknown>) => void,
): Promise<Record<string, unknown>> {
  const manifest = await readManifest(root);
  patch(manifest);
  manifest.reviewSubjectSha256 = computeReviewSubject(manifest);
  await writeManifest(root, manifest);
  runGit(root, ["add", "--", V2_MANIFEST_PATH]);
  commitFixture(root, "fixture patch");
  return manifest;
}

/** Adds one tracked file to a fixture repository and commits it. */
async function addFixtureFile(
  root: string,
  path: string,
  content: string,
): Promise<void> {
  await mkdir(dirname(resolve(root, path)), { recursive: true });
  await writeFile(resolve(root, path), content, "utf8");
  runGit(root, ["add", "--", path]);
  commitFixture(root, "fixture file");
}

/** Extracts one workflow step block by its exact step name. */
function extractWorkflowStep(workflow: string, name: string): string {
  const lines = workflow.split("\n");
  const start = lines.findIndex((line) => line.trim() === `- name: ${name}`);
  if (start === -1) {
    throw new Error(`workflow step not found: ${name}`);
  }
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => /^\s*-\s+name:/.test(line));
  return (end === -1 ? rest : rest.slice(0, end)).join("\n");
}

/** Creates one minimal clean architecture checker report. */
function cleanReport(): ArchitectureCheckReport {
  return {
    schemaVersion: 1,
    status: "clean",
    filesScanned: 0,
    findings: [],
    parseErrors: [],
  };
}

/** Runs the refresh command in one fixture repository working directory. */
function runRefreshCli(root: string, args: readonly string[]): RefreshRun {
  const cliPath = resolve(repositoryRoot, REFRESH_CLI_PATH);
  expect(
    existsSync(cliPath),
    `the refresh command must exist at ${REFRESH_CLI_PATH}`,
  ).toBe(true);
  const result = spawnSync(TSX_PATH, [cliPath, ...args], {
    cwd: root,
    encoding: "utf8",
  });
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("architecture CI input pin contract", () => {
  let realManifestBytes = "";
  let base: Fixture;
  let staleRoot = "";
  let staleManifest: Record<string, unknown>;
  let implementationTreeRoot = "";
  let implementationTreeManifest: Record<string, unknown>;
  let implementationAndTestTreeRoot = "";
  let implementationAndTestTreeManifest: Record<string, unknown>;
  let nonCanonicalRoot = "";
  let nonCanonicalManifest: Record<string, unknown>;
  let newAnalyzedFileRoot = "";
  let previewRoot = "";
  let acknowledgedRoot = "";
  let canonicalRoot = "";
  let analysisErrorRoot = "";
  let validationFailureRoot = "";

  beforeAll(async () => {
    realManifestBytes = await readFile(
      resolve(repositoryRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    base = await createBaseFixture();

    staleRoot = await cloneFixture(base.root, "stale");
    staleManifest = await patchManifest(staleRoot, (manifest) => {
      manifest.analyzerInputSnapshotSha256 = WRONG_HASH;
    });

    implementationTreeRoot = await cloneFixture(base.root, "implementation-tree");
    implementationTreeManifest = await patchManifest(
      implementationTreeRoot,
      (manifest) => {
        manifest.analyzerImplementationTreeSha256 = WRONG_HASH;
      },
    );

    implementationAndTestTreeRoot = await cloneFixture(
      base.root,
      "implementation-and-test-tree",
    );
    implementationAndTestTreeManifest = await patchManifest(
      implementationAndTestTreeRoot,
      (manifest) => {
        manifest.implementationAndTestTreeSha256 = WRONG_HASH;
      },
    );

    nonCanonicalRoot = await cloneFixture(base.root, "non-canonical");
    nonCanonicalManifest = await readManifest(nonCanonicalRoot);
    await writeFile(
      resolve(nonCanonicalRoot, V2_MANIFEST_PATH),
      JSON.stringify(nonCanonicalManifest, null, 2),
      "utf8",
    );

    newAnalyzedFileRoot = await cloneFixture(base.root, "new-analyzed-file");
    await addFixtureFile(
      newAnalyzedFileRoot,
      "apps/example/src/added.ts",
      "export const added = true;\n",
    );

    previewRoot = await cloneFixture(staleRoot, "preview");
    acknowledgedRoot = await cloneFixture(staleRoot, "acknowledged");
    canonicalRoot = await cloneFixture(staleRoot, "canonical");
    analysisErrorRoot = await cloneFixture(staleRoot, "analysis-error");
    await addFixtureFile(
      analysisErrorRoot,
      "apps/example/src/broken.ts",
      "export const broken = ;\n",
    );
    validationFailureRoot = await cloneFixture(staleRoot, "validation-failure");
    await patchManifest(validationFailureRoot, (manifest) => {
      manifest.acceptance = { status: "accepted", defaultPolicy: "v2" };
    });
  }, FIXTURE_TIMEOUT_MS);

  afterAll(async () => {
    const currentBytes = await readFile(
      resolve(repositoryRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    if (currentBytes !== realManifestBytes) {
      await writeFile(
        resolve(repositoryRoot, V2_MANIFEST_PATH),
        realManifestBytes,
        "utf8",
      );
      throw new Error(
        "the refresh command wrote the real repository manifest; the bytes were restored",
      );
    }
    await Promise.all(
      temporaryRoots
        .splice(0)
        .map((root) => rm(root, { recursive: true, force: true })),
    );
  });

  it("fixture_positive_control", async () => {
    const sync = validateAnalyzerReconciliationManifestV2Sync({
      repoRoot: base.root,
      manifest: base.manifest,
    });
    expect(sync.valid).toBe(true);
    const asyncResult = await validateAnalyzerReconciliationManifestV2({
      repoRoot: base.root,
      manifest: base.manifest,
    });
    expect(asyncResult.valid).toBe(true);
  }, FIXTURE_TIMEOUT_MS);

  it("ac1_pin_error_present_without_option", async () => {
    const result = await validateAnalyzerReconciliationManifestV2({
      repoRoot: staleRoot,
      manifest: staleManifest,
    });
    expect(result.valid).toBe(false);
    expect((result.errors ?? []).join("; ")).toContain(PIN_ERROR);
  }, FIXTURE_TIMEOUT_MS);

  it("ac1_pin_error_absent_with_option", async () => {
    const result = await validateAnalyzerReconciliationManifestV2(
      withPinOption(
        { repoRoot: staleRoot, manifest: staleManifest },
        false,
      ),
    );
    expect((result.errors ?? []).join("; ")).not.toContain(PIN_ERROR);
    expect(result.valid).toBe(true);
  }, FIXTURE_TIMEOUT_MS);

  it("ac1_sync_validator_skips_pin", () => {
    const result = validateAnalyzerReconciliationManifestV2Sync(
      withPinOption(
        { repoRoot: staleRoot, manifest: staleManifest },
        false,
      ),
    );
    expect((result.errors ?? []).join("; ")).not.toContain(PIN_ERROR);
    expect(result.valid).toBe(true);
  }, FIXTURE_TIMEOUT_MS);

  it("ac2_new_analyzed_file_fails_with_report_hash", async () => {
    const manifest = await readManifest(newAnalyzedFileRoot);
    const result = await validateAnalyzerReconciliationManifestV2(
      withPinOption(
        { repoRoot: newAnalyzedFileRoot, manifest },
        false,
      ),
    );
    expect(result.valid).toBe(false);
    expect((result.errors ?? []).join("; ")).toContain(REPORT_ERROR);
    expect((result.errors ?? []).join("; ")).not.toContain(PIN_ERROR);
  }, FIXTURE_TIMEOUT_MS);

  it("ac2_ci_mode_cli_exits_non_zero", async () => {
    const errors: string[] = [];
    const exitCode = await mainArchitectureCheckCli(
      ["--skip-input-snapshot-pin", "--repo-root", newAnalyzedFileRoot],
      newAnalyzedFileRoot,
      {
        writeStdout: () => {},
        writeStderr: (output) => errors.push(output),
      },
    );
    expect(exitCode).not.toBe(0);
    expect(errors.join("")).toContain(REPORT_ERROR);
  }, FIXTURE_TIMEOUT_MS);

  it("ac3_implementation_tree_error_survives_skip", async () => {
    const result = await validateAnalyzerReconciliationManifestV2(
      withPinOption(
        {
          repoRoot: implementationTreeRoot,
          manifest: implementationTreeManifest,
        },
        false,
      ),
    );
    expect(result.valid).toBe(false);
    expect((result.errors ?? []).join("; ")).toContain(IMPLEMENTATION_TREE_ERROR);
  }, FIXTURE_TIMEOUT_MS);

  it("ac3b_implementation_and_test_tree_error_survives_skip", async () => {
    const result = await validateAnalyzerReconciliationManifestV2(
      withPinOption(
        {
          repoRoot: implementationAndTestTreeRoot,
          manifest: implementationAndTestTreeManifest,
        },
        false,
      ),
    );
    expect(result.valid).toBe(false);
    expect((result.errors ?? []).join("; ")).toContain(
      IMPLEMENTATION_AND_TEST_TREE_ERROR,
    );
  }, FIXTURE_TIMEOUT_MS);

  it("ac3c_canonical_manifest_source_error_survives_skip", async () => {
    const result = await validateAnalyzerReconciliationManifestV2(
      withPinOption(
        {
          repoRoot: nonCanonicalRoot,
          manifest: nonCanonicalManifest,
        },
        false,
      ),
    );
    expect(result.valid).toBe(false);
    expect((result.errors ?? []).join("; ")).toContain(
      "v2 manifest must use canonical pretty JSON with one trailing newline",
    );
  }, FIXTURE_TIMEOUT_MS);

  it("ac4_workflow_step_runs_the_flag", () => {
    const workflow = readFileSync(
      resolve(repositoryRoot, ".github/workflows/ci.yml"),
      "utf8",
    );
    const step = extractWorkflowStep(workflow, "Architecture boundary check");
    const runLines = step
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.startsWith("run:"));
    expect(runLines).toContain(
      "run: pnpm architecture:check --skip-input-snapshot-pin",
    );
  });

  it("ac4_local_script_holds_no_flag", () => {
    const rootPackage = JSON.parse(
      readFileSync(resolve(repositoryRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };
    expect(rootPackage.scripts["architecture:check"]).not.toContain("--skip");
  });

  it("ac4_cli_passes_the_flag_to_the_checker", async () => {
    const stub = vi.fn(async () => cleanReport());
    await expect(
      runArchitectureCheckCli(
        ["--skip-input-snapshot-pin", "--repo-root", "/repo"],
        "/cwd",
        { checkRepository: stub, writeStdout: () => {} },
      ),
    ).resolves.toBe(0);
    expect(stub).toHaveBeenCalledWith(
      expect.objectContaining({ skipInputSnapshotPin: true }),
    );
    const plainStub = vi.fn(async () => cleanReport());
    await runArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
      checkRepository: plainStub,
      writeStdout: () => {},
    });
    expect(plainStub).toHaveBeenCalledWith(
      expect.not.objectContaining({ skipInputSnapshotPin: true }),
    );
  });

  it("ac4_no_environment_variable_selects_the_mode", async () => {
    const previous = process.env.SKIP_INPUT_SNAPSHOT_PIN;
    const previousArchitecture = process.env.ARCHITECTURE_SKIP_INPUT_SNAPSHOT_PIN;
    process.env.SKIP_INPUT_SNAPSHOT_PIN = "1";
    process.env.ARCHITECTURE_SKIP_INPUT_SNAPSHOT_PIN = "1";
    try {
      const stub = vi.fn(async () => cleanReport());
      await runArchitectureCheckCli(["--repo-root", "/repo"], "/cwd", {
        checkRepository: stub,
        writeStdout: () => {},
      });
      expect(stub).toHaveBeenCalledWith(
        expect.not.objectContaining({ skipInputSnapshotPin: true }),
      );
    } finally {
      if (previous === undefined) {
        delete process.env.SKIP_INPUT_SNAPSHOT_PIN;
      } else {
        process.env.SKIP_INPUT_SNAPSHOT_PIN = previous;
      }
      if (previousArchitecture === undefined) {
        delete process.env.ARCHITECTURE_SKIP_INPUT_SNAPSHOT_PIN;
      } else {
        process.env.ARCHITECTURE_SKIP_INPUT_SNAPSHOT_PIN = previousArchitecture;
      }
    }
    const cliSource = readFileSync(
      resolve(repositoryRoot, "packages/architecture-enforcement/src/architecture-check-cli.ts"),
      "utf8",
    );
    const checkerSource = readFileSync(
      resolve(repositoryRoot, "packages/architecture-enforcement/src/architecture-check.ts"),
      "utf8",
    );
    expect(cliSource).not.toContain("process.env");
    expect(checkerSource).not.toContain("process.env");
  });

  it("ac4_unknown_flag_is_rejected", () => {
    const discover = vi.fn(() => "/discovered/repo");
    for (const args of [
      ["--skip-input-snapshot-pins"],
      ["--skip_input_snapshot_pin"],
      ["--skip-input-snapshot-pin=true"],
    ]) {
      expect(() =>
        parseArchitectureCheckArguments(args, "/cwd", discover),
      ).toThrow();
    }
  });

  it("ac5_preview_prints_old_and_new_and_writes_nothing", async () => {
    const before = await readFile(
      resolve(previewRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    const expected = computeAnalyzerInputSnapshotSha256Sync(
      previewRoot,
      selectV2AnalyzerSourcePaths(previewRoot),
    );
    const run = runRefreshCli(previewRoot, []);
    expect(run.status).toBe(1);
    expect(run.output).toContain(WRONG_HASH);
    expect(run.output).toContain(expected);
    const after = await readFile(resolve(previewRoot, V2_MANIFEST_PATH), "utf8");
    expect(after).toBe(before);
  }, FIXTURE_TIMEOUT_MS);

  it("ac5_acknowledged_run_writes_the_five_fields", async () => {
    const run = runRefreshCli(acknowledgedRoot, ["--acknowledge"]);
    expect(run.status).toBe(0);
    const written = await readManifest(acknowledgedRoot);
    expect(Object.keys(written)).toEqual(Object.keys(staleManifest));
    expect(written.analyzerInputSnapshotSha256).toBe(
      computeAnalyzerInputSnapshotSha256Sync(
        acknowledgedRoot,
        selectV2AnalyzerSourcePaths(acknowledgedRoot),
      ),
    );
    expect(written.analyzerImplementationTreeSha256).toBe(
      computeAnalyzerImplementationTreeSha256V2Sync(acknowledgedRoot),
    );
    expect(written.implementationAndTestTreeSha256).toBe(
      computeReconciliationImplementationTreeSha256V2Sync(acknowledgedRoot),
    );
    const reportHash = await computeAnalyzerReportSha256(acknowledgedRoot);
    expect(written.reportSha256s).toEqual([reportHash, reportHash]);
    expect(written.reviewSubjectSha256).toBe(computeReviewSubject(written));
    const validation = await validateAnalyzerReconciliationManifestV2({
      repoRoot: acknowledgedRoot,
      manifest: written,
    });
    expect(validation.valid).toBe(true);
  }, FIXTURE_TIMEOUT_MS);

  it("ac5_acknowledged_run_writes_canonical_bytes", async () => {
    const run = runRefreshCli(canonicalRoot, ["--acknowledge"]);
    expect(run.status).toBe(0);
    const bytes = await readFile(resolve(canonicalRoot, V2_MANIFEST_PATH), "utf8");
    expect(bytes).toBe(`${JSON.stringify(JSON.parse(bytes), null, 2)}\n`);
  }, FIXTURE_TIMEOUT_MS);

  it("ac5_analysis_error_exits_two_and_writes_nothing", async () => {
    const before = await readFile(
      resolve(analysisErrorRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    const run = runRefreshCli(analysisErrorRoot, ["--acknowledge"]);
    expect(run.status).toBe(2);
    const after = await readFile(
      resolve(analysisErrorRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    expect(after).toBe(before);
  }, FIXTURE_TIMEOUT_MS);

  it("ac5_validation_failure_restores_the_old_bytes", async () => {
    const before = await readFile(
      resolve(validationFailureRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    const run = runRefreshCli(validationFailureRoot, ["--acknowledge"]);
    expect(run.status).not.toBe(0);
    const after = await readFile(
      resolve(validationFailureRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    expect(after).toBe(before);
  }, FIXTURE_TIMEOUT_MS);

  it("fr6_documentation_names_the_three_commands", () => {
    const documentation = readFileSync(
      resolve(repositoryRoot, "docs/architecture-enforcement.md"),
      "utf8",
    );
    const lines = documentation.split("\n").map((line) => line.trim());
    expect(lines).toContain("pnpm architecture:check --skip-input-snapshot-pin");
    expect(lines).toContain("pnpm architecture:check");
    expect(
      lines.some((line) => line.startsWith("pnpm architecture:pin:refresh")),
    ).toBe(true);
  });
});
