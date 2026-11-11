import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  parsePinRefreshArguments,
  runArchitecturePinRefreshCli,
  type PinRefreshCliDependencies,
} from "../architecture-pin-refresh-cli.js";
import {
  computeAnalyzerImplementationTreeSha256V2Sync,
  computeReconciliationImplementationTreeSha256V2Sync,
} from "../reconciliation-manifest.js";
import {
  selectV2AnalyzerSourcePaths,
  validateAnalyzerReconciliationManifestV2Sync,
} from "../v2-manifest-validation.js";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const STORE_RELATIVE_PATH = ".cache/architecture-pin-refresh/checkpoint.json";
const DOCUMENTATION_PATH = "docs/architecture-enforcement.md";
const PIN_ERROR = "Analyzer input snapshot hash does not match current bytes";
const REPORT_MISMATCH_ERROR = "Analyzer reports are not byte-identical";
const WRONG_HASH = "0123456789abcdef".repeat(4);
const FIXTURE_TIMEOUT_MS = 300_000;
const HOOK_TIMEOUT_MS = 900_000;
const BUDGET_SECONDS = 8;
const BATCH_MODULES = 2;
const CLOCK_STEP_MS = 1_000;
const CLOCK_JUMP_MS = 1_000_000;
const MAX_SERIES_RUNS = 50;
const APPS_MODULE_PATHS = [
  "apps/example/src/module-1.ts",
  "apps/example/src/module-2.ts",
  "apps/example/src/module-3.ts",
  "apps/example/src/module-4.ts",
  "apps/example/src/module-5.ts",
  "apps/example/src/module-6.ts",
  "apps/example/src/module-7.ts",
  "apps/example/src/module-8.ts",
];
const FORBIDDEN_KEY_TEXTS = ["hash", "sha256", "checksum"];

/** Counting seams shared by the mock wrappers. */
const seams = vi.hoisted(() => ({
  analyzerCalls: 0,
  archiveCalls: 0,
  reportedModules: 0,
}));

vi.mock("node:child_process", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("node:child_process")>();
  const realExecFileSync = actual.execFileSync;
  function wrappedExecFileSync(...args: unknown[]): unknown {
    const command = args[0];
    const commandArgs = args[1];
    if (
      command === "git" &&
      Array.isArray(commandArgs) &&
      commandArgs[0] === "archive"
    ) {
      seams.archiveCalls += 1;
    }
    return (realExecFileSync as unknown as (...callArgs: unknown[]) => unknown)(
      ...args,
    );
  }
  return { ...actual, execFileSync: wrappedExecFileSync };
});

vi.mock("../analyzer.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../analyzer.js")>();
  return {
    ...actual,
    analyzeArchitectureSources: async (
      ...args: Parameters<typeof actual.analyzeArchitectureSources>
    ) => {
      seams.analyzerCalls += 1;
      const result = await actual.analyzeArchitectureSources(...args);
      seams.reportedModules += result.sourcePaths.length;
      return result;
    },
  };
});

const temporaryRoots: string[] = [];

/** One temporary fixture repository and its committed manifest. */
interface Fixture {
  root: string;
  manifest: Record<string, unknown>;
}

/** One measured refresh run with its output and its failure. */
interface RefreshRun {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  error: Error | null;
}

/** One module analysis event reported by the resume seam. */
interface ModuleEvent {
  pass: 1 | 2;
  sourcePath: string;
}

/** Clock, batch, and seam control for one measured run. */
interface RunControl {
  clockMs: number;
  stepMs: number;
  jumpMs: number;
  jumpMarker: string | null;
  batchModules: number | null;
  onModuleAnalyzed: ((pass: 1 | 2, sourcePath: string) => void) | null;
  onLine: ((line: string) => void) | null;
}

/** One stored checkpoint record for a resume run. */
interface CheckpointStore {
  version: number;
  headCommit: string;
  candidatePaths: string[];
  sourcePaths: string[];
  passes: Array<{ modules: Record<string, unknown[]> }>;
}

/** The result of one split refresh series. */
interface SeriesResult {
  runs: number;
  exitCodes: number[];
  events: ModuleEvent[];
  perRunEvents: ModuleEvent[][];
  archiveCalls: number;
  analyzerCalls: number;
  storeSnapshots: CheckpointStore[];
  manifest: Record<string, unknown> | null;
  manifestBytes: string | null;
  storeExists: boolean;
  error: Error | null;
}

/** Refresh dependencies that the base command does not expose yet. */
interface ResumeDependencies {
  discoverRepositoryRoot?: (cwd: string) => string;
  writeStdout?: (output: string) => void;
  writeStderr?: (output: string) => void;
  now?: () => number;
  batchModules?: number;
  onModuleAnalyzed?: (pass: 1 | 2, sourcePath: string) => void;
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

/** Runs one Git command and returns its exit code without throwing. */
function runGitStatus(root: string, args: readonly string[]): number {
  try {
    execFileSync("git", [...args], {
      cwd: root,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return 0;
  } catch (error) {
    const status = (error as { status?: number }).status;
    return typeof status === "number" ? status : 1;
  }
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

/** Creates the stale refresh fixture with a committed manifest. */
async function createBaseFixture(): Promise<Fixture> {
  const root = await mkdtemp(join(tmpdir(), "architecture-resume-base-"));
  temporaryRoots.push(root);
  await cp(
    resolve(packageRoot, "src"),
    resolve(root, "packages/architecture-enforcement/src"),
    { recursive: true },
  );
  await writeFile(
    resolve(root, "package.json"),
    `${JSON.stringify({ name: "architecture-resume-fixture", private: true }, null, 2)}\n`,
    "utf8",
  );
  await writeFile(
    resolve(root, "pnpm-workspace.yaml"),
    "packages:\n  - apps/*\n  - packages/*\n",
    "utf8",
  );
  await writeFile(
    resolve(root, ".gitignore"),
    "packages/architecture-enforcement/src/__tests__/\n",
    "utf8",
  );
  for (const [index, path] of APPS_MODULE_PATHS.entries()) {
    await mkdir(dirname(resolve(root, path)), { recursive: true });
    await writeFile(
      resolve(root, path),
      `export const fixtureValue${index + 1} = ${index + 1};\n`,
      "utf8",
    );
  }
  runGit(root, ["init", "--quiet"]);
  runGit(root, [
    "add",
    "--",
    "package.json",
    "pnpm-workspace.yaml",
    ".gitignore",
    "packages/architecture-enforcement/src",
    "apps",
  ]);
  commitFixture(root, "fixture base");
  const manifest = await readManifest(root);
  manifest.analyzerImplementationTreeSha256 =
    computeAnalyzerImplementationTreeSha256V2Sync(root);
  manifest.implementationAndTestTreeSha256 =
    computeReconciliationImplementationTreeSha256V2Sync(root);
  manifest.analyzerInputSnapshotSha256 = WRONG_HASH;
  manifest.reviewSubjectSha256 = computeReviewSubject(manifest);
  await writeManifest(root, manifest);
  runGit(root, ["add", "--", V2_MANIFEST_PATH]);
  commitFixture(root, "fixture pins");
  return { root, manifest };
}

/** Copies one fixture repository into a new temporary repository. */
async function cloneFixture(sourceRoot: string, name: string): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), `architecture-resume-${name}-`));
  temporaryRoots.push(root);
  await cp(sourceRoot, root, { recursive: true });
  return root;
}

/** Reads the checkpoint store of a fixture repository. */
async function readStore(root: string): Promise<CheckpointStore | null> {
  try {
    const bytes = await readFile(resolve(root, STORE_RELATIVE_PATH), "utf8");
    return JSON.parse(bytes) as CheckpointStore;
  } catch {
    return null;
  }
}

/** Writes a checkpoint store file into a fixture repository. */
async function writeStore(
  root: string,
  store: CheckpointStore | string,
): Promise<void> {
  const path = resolve(root, STORE_RELATIVE_PATH);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(
    path,
    typeof store === "string" ? store : `${JSON.stringify(store, null, 2)}\n`,
    "utf8",
  );
}

/** Reads the head commit of a fixture repository. */
function headCommit(root: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  }).trim();
}

/** Creates the clock, batch, and seam control for one measured run. */
function createRunControl(
  options: {
    batchModules?: number;
    jumpMarker?: string;
    jumpMs?: number;
    onLine?: (line: string) => void;
    onModuleAnalyzed?: (pass: 1 | 2, sourcePath: string) => void;
  } = {},
): RunControl {
  return {
    clockMs: 0,
    stepMs: CLOCK_STEP_MS,
    jumpMs: options.jumpMs ?? 0,
    jumpMarker: options.jumpMarker ?? null,
    batchModules: options.batchModules ?? null,
    onModuleAnalyzed: options.onModuleAnalyzed ?? null,
    onLine: options.onLine ?? null,
  };
}

/** Runs one refresh command and captures its output and its failure. */
async function runRefresh(
  root: string,
  args: readonly string[],
  control: RunControl,
): Promise<RefreshRun> {
  const stdout: string[] = [];
  const stderr: string[] = [];
  const dependencies: ResumeDependencies = {
    discoverRepositoryRoot: () => root,
    writeStdout: (output) => {
      stdout.push(output);
      for (const line of output.split("\n")) {
        if (
          control.jumpMarker !== null &&
          control.jumpMs > 0 &&
          line.includes(control.jumpMarker)
        ) {
          control.clockMs += control.jumpMs;
        }
        if (line.includes("modules_done=")) {
          control.clockMs += control.stepMs;
        }
        control.onLine?.(line);
      }
    },
    writeStderr: (output) => {
      stderr.push(output);
    },
    now: () => control.clockMs,
  };
  if (control.batchModules !== null) {
    dependencies.batchModules = control.batchModules;
  }
  if (control.onModuleAnalyzed !== null) {
    dependencies.onModuleAnalyzed = control.onModuleAnalyzed;
  }
  try {
    const exitCode = await runArchitecturePinRefreshCli(
      args,
      root,
      dependencies as unknown as PinRefreshCliDependencies,
    );
    return {
      exitCode,
      stdout: stdout.join(""),
      stderr: stderr.join(""),
      error: null,
    };
  } catch (error) {
    return {
      exitCode: null,
      stdout: stdout.join(""),
      stderr: stderr.join(""),
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/** Merges the store snapshots of a series into one complete store. */
function mergeStoreSnapshots(
  snapshots: readonly CheckpointStore[],
): CheckpointStore | null {
  if (snapshots.length === 0) return null;
  const last = snapshots[snapshots.length - 1];
  const passes: CheckpointStore["passes"] = [
    { modules: {} },
    { modules: {} },
  ];
  for (const snapshot of snapshots) {
    snapshot.passes.forEach((pass, index) => {
      for (const [sourcePath, findings] of Object.entries(pass.modules)) {
        passes[index].modules[sourcePath] = findings;
      }
    });
  }
  return {
    version: last.version,
    headCommit: last.headCommit,
    candidatePaths: last.candidatePaths,
    sourcePaths: last.sourcePaths,
    passes,
  };
}

/** Counts the structural keys of a store that sit outside the module map. */
function structuralKeys(store: CheckpointStore): string[] {
  const keys: string[] = Object.keys(store);
  for (const pass of store.passes) {
    keys.push(...Object.keys(pass));
  }
  return keys;
}

/** Parses the labeled values of one module batch line. */
function parseBatchLine(
  line: string,
): { pass: 1 | 2; done: number; total: number } | null {
  const match =
    /^architecture pin refresh: step=modules pass=(?<pass>[12]) modules_done=(?<done>\d+) modules_total=(?<total>\d+) elapsed_s=\d+$/.exec(
      line,
    );
  if (!match?.groups) return null;
  return {
    pass: Number(match.groups.pass) === 1 ? 1 : 2,
    done: Number(match.groups.done),
    total: Number(match.groups.total),
  };
}

/** Reads the documentation file of the real repository. */
async function readDocumentation(): Promise<string> {
  return readFile(resolve(repositoryRoot, DOCUMENTATION_PATH), "utf8");
}

/** Runs the split refresh series until a run stops with a final exit code. */
async function runSeries(baseRoot: string): Promise<SeriesResult> {
  const result: SeriesResult = {
    runs: 0,
    exitCodes: [],
    events: [],
    perRunEvents: [],
    archiveCalls: 0,
    analyzerCalls: 0,
    storeSnapshots: [],
    manifest: null,
    manifestBytes: null,
    storeExists: false,
    error: null,
  };
  const root = await cloneFixture(baseRoot, "series");
  for (let index = 0; index < MAX_SERIES_RUNS; index += 1) {
    const events: ModuleEvent[] = [];
    const archiveCallsBefore = seams.archiveCalls;
    const analyzerCallsBefore = seams.analyzerCalls;
    const control = createRunControl({
      batchModules: BATCH_MODULES,
      onModuleAnalyzed: (pass, sourcePath) => {
        events.push({ pass, sourcePath });
      },
    });
    const run = await runRefresh(
      root,
      ["--acknowledge", "--budget-s", String(BUDGET_SECONDS)],
      control,
    );
    result.perRunEvents.push(events);
    result.events.push(...events);
    result.archiveCalls += seams.archiveCalls - archiveCallsBefore;
    result.analyzerCalls += seams.analyzerCalls - analyzerCallsBefore;
    if (run.error) {
      result.error = run.error;
      break;
    }
    result.exitCodes.push(run.exitCode ?? -1);
    result.runs = result.exitCodes.length;
    const store = await readStore(root);
    if (store) result.storeSnapshots.push(store);
    if (run.exitCode !== 3) break;
  }
  result.runs = result.exitCodes.length;
  result.manifest = await readManifest(root);
  result.manifestBytes = await readFile(
    resolve(root, V2_MANIFEST_PATH),
    "utf8",
  );
  result.storeExists = (await readStore(root)) !== null;
  return result;
}

describe("architecture pin refresh resume", () => {
  let base: Fixture;
  let fixtureModules = 0;
  let controlRoot = "";
  let controlRun: RefreshRun;
  let controlManifest: Record<string, unknown> = {};
  let controlManifestBytes = "";
  let controlArchiveCalls = 0;
  let controlAnalyzerCalls = 0;
  let controlReportedModules = 0;
  let stepRun: RefreshRun;
  let stepValidateCounters: {
    analyzerCalls: number;
    archiveCalls: number;
  } | null = null;
  let stepEndCounters = { analyzerCalls: 0, archiveCalls: 0 };
  let partialRoot = "";
  let partialRun: RefreshRun;
  let partialStore: CheckpointStore | null = null;
  let partialEvents: ModuleEvent[] = [];
  let partialManifestBytes = "";
  let overlayRoot = "";
  let overlayRun: RefreshRun;
  let series: SeriesResult;

  beforeAll(async () => {
    base = await createBaseFixture();
    fixtureModules = selectV2AnalyzerSourcePaths(base.root).length;

    controlRoot = await cloneFixture(base.root, "control");
    const archiveCallsBeforeControl = seams.archiveCalls;    const analyzerCallsBeforeControl = seams.analyzerCalls;
    const reportedModulesBeforeControl = seams.reportedModules;
    controlRun = await runRefresh(
      controlRoot,
      ["--acknowledge"],
      createRunControl(),
    );
    controlArchiveCalls = seams.archiveCalls - archiveCallsBeforeControl;
    controlAnalyzerCalls = seams.analyzerCalls - analyzerCallsBeforeControl;
    controlReportedModules = seams.reportedModules - reportedModulesBeforeControl;
    controlManifest = await readManifest(controlRoot);
    controlManifestBytes = await readFile(
      resolve(controlRoot, V2_MANIFEST_PATH),
      "utf8",
    );

    const stepRoot = await cloneFixture(base.root, "steps");
    stepRun = await runRefresh(
      stepRoot,
      ["--acknowledge"],
      createRunControl({
        batchModules: BATCH_MODULES,
        onLine: (line) => {
          if (line.includes("step=validate")) {
            stepValidateCounters = {
              analyzerCalls: seams.analyzerCalls,
              archiveCalls: seams.archiveCalls,
            };
          }
        },
      }),
    );
    stepEndCounters = {
      analyzerCalls: seams.analyzerCalls,
      archiveCalls: seams.archiveCalls,
    };

    partialRoot = await cloneFixture(base.root, "partial");
    partialManifestBytes = await readFile(
      resolve(partialRoot, V2_MANIFEST_PATH),
      "utf8",
    );
    partialRun = await runRefresh(
      partialRoot,
      ["--acknowledge", "--budget-s", String(BUDGET_SECONDS)],
      createRunControl({
        batchModules: BATCH_MODULES,
        onModuleAnalyzed: (pass, sourcePath) => {
          partialEvents.push({ pass, sourcePath });
        },
      }),
    );
    partialStore = await readStore(partialRoot);

    overlayRoot = await cloneFixture(base.root, "overlay");
    const overlayFile = resolve(
      overlayRoot,
      "packages/architecture-enforcement/src/v2-manifest-validation.ts",
    );
    await writeFile(
      overlayFile,
      `${await readFile(overlayFile, "utf8")}\n// fixture candidate overlay\n`,
      "utf8",
    );
    overlayRun = await runRefresh(
      overlayRoot,
      ["--acknowledge"],
      createRunControl(),
    );

    series = await runSeries(base.root);
  }, HOOK_TIMEOUT_MS);

  afterAll(async () => {
    for (const root of temporaryRoots) {
      await rm(root, { recursive: true, force: true });
    }
  });

  it(
    "resume_fixture_positive_control",
    async () => {
      const staleValidation = validateAnalyzerReconciliationManifestV2Sync({
        repoRoot: base.root,
        manifest: base.manifest,
      });
      expect(staleValidation.valid).toBe(false);
      expect(staleValidation.errors?.join(" ") ?? "").toContain(PIN_ERROR);
      expect(controlRun.error).toBeNull();
      expect(controlRun.exitCode).toBe(0);
      const writtenValidation = validateAnalyzerReconciliationManifestV2Sync({
        repoRoot: controlRoot,
        manifest: controlManifest,
      });
      expect(writtenValidation.valid).toBe(true);
      expect(
        fixtureModules,
        `fixture_modules=${fixtureModules}`,
      ).toBeGreaterThanOrEqual(7);
      expect(
        controlAnalyzerCalls,
        `analyzer_calls=${controlAnalyzerCalls}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        controlArchiveCalls,
        `archive_calls=${controlArchiveCalls}`,
      ).toBeGreaterThanOrEqual(1);
      const moduleEvents =
        partialEvents.length > 0 ? partialEvents.length : controlReportedModules;
      expect(
        moduleEvents,
        `module_events=${moduleEvents}`,
      ).toBeGreaterThanOrEqual(1);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac9_step_lines_for_every_step",
    async () => {
      expect(stepRun.error).toBeNull();
      const lines = stepRun.stdout.split("\n").filter((line) => line !== "");
      const stepPattern =
        /^architecture pin refresh: step=(?<name>store|projection|combine|input_snapshot|trees|validate) elapsed_s=\d+$/;
      const stepNames = lines
        .map((line) => stepPattern.exec(line)?.groups?.name)
        .filter((name): name is string => name !== undefined);
      for (const name of [
        "store",
        "projection",
        "combine",
        "input_snapshot",
        "trees",
        "validate",
      ]) {
        expect(
          stepNames.filter((value) => value === name).length,
          `step_lines=${stepNames.length} missing_step=${name}`,
        ).toBeGreaterThanOrEqual(1);
      }
      const preludePassFirst =
        /^architecture pin refresh: step=prelude pass=(?<pass>[12]) elapsed_s=\d+$/;
      const elapsedPassLast =
        /^architecture pin refresh: step=prelude elapsed_s=\d+ pass=(?<pass>[12])$/;
      const preludePasses = lines
        .map(
          (line) =>
            preludePassFirst.exec(line)?.groups?.pass ??
            elapsedPassLast.exec(line)?.groups?.pass,
        )
        .filter((value): value is string => value !== undefined);
      expect(
        preludePasses.filter((value) => value === "1").length,
        `prelude_lines=${preludePasses.length} missing_pass=1`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        preludePasses.filter((value) => value === "2").length,
        `prelude_lines=${preludePasses.length} missing_pass=2`,
      ).toBeGreaterThanOrEqual(1);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac9_batch_lines_count_up_to_total",
    async () => {
      expect(stepRun.error).toBeNull();
      const lines = stepRun.stdout.split("\n").filter((line) => line !== "");
      const batches = lines
        .map((line) => parseBatchLine(line))
        .filter((value): value is NonNullable<typeof value> => value !== null);
      const passOne = batches.filter((batch) => batch.pass === 1);
      const passTwo = batches.filter((batch) => batch.pass === 2);
      expect(
        passOne.length,
        `batch_lines_pass1=${passOne.length}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        passTwo.length,
        `batch_lines_pass2=${passTwo.length}`,
      ).toBeGreaterThanOrEqual(1);
      for (const pass of [passOne, passTwo]) {
        const doneValues = pass.map((batch) => batch.done);
        for (let index = 1; index < doneValues.length; index += 1) {
          expect(
            doneValues[index],
            `modules_done=${doneValues[index]} previous=${doneValues[index - 1]}`,
          ).toBeGreaterThan(doneValues[index - 1]);
        }
        const last = pass[pass.length - 1];
        expect(
          last.done,
          `modules_done=${last.done} modules_total=${last.total}`,
        ).toBe(last.total);
      }
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac10_store_written_after_partial_run",
    async () => {
      expect(partialRun.error).toBeNull();
      expect(
        partialRun.exitCode,
        `exit_code=${partialRun.exitCode}`,
      ).toBe(3);
      expect(partialStore).not.toBeNull();
      const store = partialStore as CheckpointStore;
      expect(store.version).toBe(1);
      const fixtureHead = headCommit(base.root);
      expect(store.headCommit).toBe(fixtureHead);
      expect(store.headCommit).toMatch(/^[0-9a-f]{40}$/);
      expect(store.candidatePaths).toEqual([]);
      expect(store.sourcePaths).toEqual(
        selectV2AnalyzerSourcePaths(base.root),
      );
      const storedModules = Object.keys(store.passes[0].modules);
      expect(
        storedModules.length,
        `stored_modules=${storedModules.length} fixture_modules=${fixtureModules}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        storedModules.length,
        `stored_modules=${storedModules.length} fixture_modules=${fixtureModules}`,
      ).toBeLessThan(fixtureModules);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac10_store_holds_no_hash_key",
    async () => {
      expect(partialStore).not.toBeNull();
      const store = partialStore as CheckpointStore;
      const keys = structuralKeys(store);
      expect(keys.length, `structural_keys=${keys.length}`).toBeGreaterThan(0);
      for (const key of keys) {
        const lowered = key.toLowerCase();
        for (const forbidden of FORBIDDEN_KEY_TEXTS) {
          expect(
            lowered.includes(forbidden),
            `structural_key=${key} forbidden_text=${forbidden}`,
          ).toBe(false);
        }
      }
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac10_store_path_is_git_ignored",
    () => {
      const status = runGitStatus(repositoryRoot, [
        "check-ignore",
        "-q",
        STORE_RELATIVE_PATH,
      ]);
      expect(status, `check_ignore_status=${status}`).toBe(0);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac11_store_from_another_head_is_discarded",
    async () => {
      const root = await cloneFixture(base.root, "head-changed");
      await writeStore(root, {
        version: 1,
        headCommit: "0".repeat(40),
        candidatePaths: [],
        sourcePaths: selectV2AnalyzerSourcePaths(base.root),
        passes: [
          {
            modules: {
              [APPS_MODULE_PATHS[0]]: [
                { semanticKey: "a".repeat(64), instanceKey: "b".repeat(64) },
              ],
            },
          },
          { modules: {} },
        ],
      });
      const events: ModuleEvent[] = [];
      const run = await runRefresh(
        root,
        ["--acknowledge", "--budget-s", "100000"],
        createRunControl({
          batchModules: BATCH_MODULES,
          onModuleAnalyzed: (pass, sourcePath) => {
            events.push({ pass, sourcePath });
          },
        }),
      );
      expect(run.error).toBeNull();
      expect(run.stdout).toContain("checkpoint=discarded reason=head_changed");
      const passOneEvents = events.filter((event) => event.pass === 1);
      expect(
        passOneEvents.length,
        `pass1_events=${passOneEvents.length} fixture_modules=${fixtureModules}`,
      ).toBe(fixtureModules);
      const manifest = await readManifest(root);
      expect(
        canonicalJson(manifest),
        "manifest_differs_from_the_run_without_a_store",
      ).toBe(canonicalJson(controlManifest));
    },
    FIXTURE_TIMEOUT_MS,
  );

  it.each([
    {
      label: "unreadable",
      reason: "unreadable",
      buildStore: (): CheckpointStore | string => "this file holds no json",
    },
    {
      label: "version",
      reason: "version",
      buildStore: (head: string): CheckpointStore => ({
        version: 2,
        headCommit: head,
        candidatePaths: [],
        sourcePaths: [],
        passes: [{ modules: {} }, { modules: {} }],
      }),
    },
    {
      label: "source_paths",
      reason: "source_paths",
      buildStore: (head: string): CheckpointStore => ({
        version: 1,
        headCommit: head,
        candidatePaths: [],
        sourcePaths: ["apps/example/src/module-1.ts"],
        passes: [{ modules: {} }, { modules: {} }],
      }),
    },
    {
      label: "candidate_overlay",
      reason: "candidate_overlay",
      buildStore: (head: string): CheckpointStore => ({
        version: 1,
        headCommit: head,
        candidatePaths: [APPS_MODULE_PATHS[0]],
        sourcePaths: [],
        passes: [{ modules: {} }, { modules: {} }],
      }),
    },
  ])(
    "ac11_unusable_stores_are_discarded: $label",
    async ({ buildStore, reason }) => {
      const root = await cloneFixture(base.root, `discard-${reason}`);
      await writeStore(root, buildStore(headCommit(root)));
      const run = await runRefresh(
        root,
        ["--acknowledge", "--budget-s", "100000"],
        createRunControl({ batchModules: BATCH_MODULES }),
      );
      expect(run.error).toBeNull();
      expect(run.stdout).toContain(`checkpoint=discarded reason=${reason}`);
      const manifest = await readManifest(root);
      expect(
        canonicalJson(manifest),
        `manifest_differs_from_the_run_without_a_store reason=${reason}`,
      ).toBe(canonicalJson(controlManifest));
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac11_changed_candidate_root_bypasses_store",
    async () => {
      expect(overlayRun.error).toBeNull();
      expect(overlayRun.exitCode).toBe(0);
      const overlayStore = await readStore(overlayRoot);
      expect(
        overlayStore,
        "the_run_wrote_a_store_while_the_candidate_root_changed",
      ).toBeNull();
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac11_candidate_overlay_prints_checkpoint_off",
    async () => {
      expect(overlayRun.error).toBeNull();
      expect(overlayRun.stdout).toContain(
        "checkpoint=off reason=candidate_overlay",
      );
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac12_run_stops_at_budget_with_exit_3",
    async () => {
      expect(partialRun.error).toBeNull();
      expect(
        partialRun.exitCode,
        `exit_code=${partialRun.exitCode}`,
      ).toBe(3);
      expect(partialRun.stdout).toMatch(
        /^architecture pin refresh: partial pass=[12] modules_done=\d+ modules_total=\d+; run again with the same arguments$/m,
      );
      expect(partialStore).not.toBeNull();
      const storedModules = Object.keys(
        (partialStore as CheckpointStore).passes[0].modules,
      );
      expect(
        storedModules.length,
        `stored_modules=${storedModules.length} fixture_modules=${fixtureModules}`,
      ).toBeGreaterThanOrEqual(1);
      expect(
        storedModules.length,
        `stored_modules=${storedModules.length} fixture_modules=${fixtureModules}`,
      ).toBeLessThan(fixtureModules);
      expect(
        partialEvents.length,
        `module_events=${partialEvents.length} stored_modules=${storedModules.length}`,
      ).toBe(storedModules.length);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac12_partial_run_writes_no_manifest_with_acknowledge",
    async () => {
      expect(partialRun.error).toBeNull();
      expect(
        partialRun.exitCode,
        `exit_code=${partialRun.exitCode}`,
      ).toBe(3);
      const bytesAfter = await readFile(
        resolve(partialRoot, V2_MANIFEST_PATH),
        "utf8",
      );
      expect(
        bytesAfter,
        "manifest_bytes_changed_in_an_exit_3_run",
      ).toBe(partialManifestBytes);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac12_zero_progress_run_exits_2",
    async () => {
      const root = await cloneFixture(base.root, "zero-progress");
      const run = await runRefresh(
        root,
        ["--acknowledge", "--budget-s", String(BUDGET_SECONDS)],
        createRunControl({
          batchModules: BATCH_MODULES,
          jumpMarker: "step=prelude",
          jumpMs: CLOCK_JUMP_MS,
        }),
      );
      expect(run.error).toBeNull();
      expect(run.exitCode, `exit_code=${run.exitCode}`).toBe(2);
      const store = await readStore(root);
      expect(store, "the_run_stored_a_module_without_progress").toBeNull();
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac12_budget_argument_parsing",
    () => {
      const badValues = [
        ["--budget-s", "0"],
        ["--budget-s", "-5"],
        ["--budget-s", "1.5"],
        ["--budget-s", "abc"],
        ["--budget-s"],
      ];
      expect(badValues.length, `bad_values=${badValues.length}`).toBe(5);
      for (const args of badValues) {
        expect(() =>
          parsePinRefreshArguments(args, repositoryRoot, () => repositoryRoot),
        ).toThrow();
      }
      const parsedDefault = parsePinRefreshArguments(
        [],
        repositoryRoot,
        () => repositoryRoot,
      ) as unknown as { budgetSeconds?: number };
      expect(
        parsedDefault.budgetSeconds,
        `budget_seconds=${String(parsedDefault.budgetSeconds)}`,
      ).toBe(1500);
      const parsedBudget = parsePinRefreshArguments(
        ["--budget-s", "900"],
        repositoryRoot,
        () => repositoryRoot,
      ) as unknown as { budgetSeconds?: number };
      expect(
        parsedBudget.budgetSeconds,
        `budget_seconds=${String(parsedBudget.budgetSeconds)}`,
      ).toBe(900);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac13_resume_analyzes_only_missing_modules",
    async () => {
      expect(series.error).toBeNull();
      const passOne = series.events.filter((event) => event.pass === 1);
      const passTwo = series.events.filter((event) => event.pass === 2);
      expect(
        passOne.length,
        `analyzed_pass1=${passOne.length} fixture_modules=${fixtureModules}`,
      ).toBe(fixtureModules);
      expect(
        passTwo.length,
        `analyzed_pass2=${passTwo.length} fixture_modules=${fixtureModules}`,
      ).toBe(fixtureModules);
      const passOnePaths = new Set(passOne.map((event) => event.sourcePath));
      const passTwoPaths = new Set(passTwo.map((event) => event.sourcePath));
      expect(passOnePaths.size).toBe(fixtureModules);
      expect(passTwoPaths.size).toBe(fixtureModules);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac13_last_run_writes_manifest_and_deletes_store",
    async () => {
      expect(series.error).toBeNull();
      expect(
        series.exitCodes[series.exitCodes.length - 1],
        `exit_codes=${series.exitCodes.join(",")}`,
      ).toBe(0);
      expect(series.manifest).not.toBeNull();
      expect(
        canonicalJson(series.manifest),
        "the_split_manifest_differs_from_the_one_run_manifest",
      ).toBe(canonicalJson(controlManifest));
      expect(series.storeExists).toBe(false);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac13_complete_store_makes_no_analyzer_call",
    async () => {
      expect(series.error).toBeNull();
      const completeStore = mergeStoreSnapshots(series.storeSnapshots);
      expect(
        completeStore,
        "the_series_produced_no_store_snapshot",
      ).not.toBeNull();
      const root = await cloneFixture(base.root, "complete-store");
      await writeStore(root, completeStore as CheckpointStore);
      const analyzerCallsBefore = seams.analyzerCalls;
      const run = await runRefresh(
        root,
        ["--acknowledge", "--budget-s", String(BUDGET_SECONDS)],
        createRunControl({ batchModules: BATCH_MODULES }),
      );
      expect(run.error).toBeNull();
      const analyzerCalls = seams.analyzerCalls - analyzerCallsBefore;
      expect(analyzerCalls, `analyzer_calls=${analyzerCalls}`).toBe(0);
      expect(run.stdout).not.toContain("step=prelude");
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac14_split_manifest_equals_full_manifest_field_by_field",
    async () => {
      expect(series.error).toBeNull();
      expect(
        series.runs,
        `runs=${series.runs}`,
      ).toBeGreaterThanOrEqual(3);
      const splitManifest = series.manifest as Record<string, unknown>;
      const fullManifest = controlManifest;
      const splitKeys = Object.keys(splitManifest);
      const fullKeys = Object.keys(fullManifest);
      expect(splitKeys).toEqual(fullKeys);
      for (const key of splitKeys) {
        expect(
          canonicalJson(splitManifest[key]),
          `field=${key}`,
        ).toBe(canonicalJson(fullManifest[key]));
      }
      expect(series.manifestBytes).toBe(controlManifestBytes);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac14_key_set_equals_v2_manifest_keys",
    async () => {
      expect(controlRun.error).toBeNull();
      const keysBefore = Object.keys(base.manifest);
      const keysAfter = Object.keys(controlManifest);
      expect(keysAfter).toEqual(keysBefore);
      const validation = validateAnalyzerReconciliationManifestV2Sync({
        repoRoot: controlRoot,
        manifest: controlManifest,
      });
      expect(validation.valid).toBe(true);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac15_projections_equal_run_count",
    async () => {
      expect(series.error).toBeNull();
      expect(
        series.runs,
        `runs=${series.runs}`,
      ).toBeGreaterThanOrEqual(3);
      expect(
        series.archiveCalls,
        `archive_calls=${series.archiveCalls} runs=${series.runs}`,
      ).toBe(series.runs);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac15_each_module_analyzed_once_per_pass",
    async () => {
      expect(series.error).toBeNull();
      const moduleEvents = series.events.length;
      expect(
        moduleEvents,
        `module_events=${moduleEvents} fixture_modules=${fixtureModules}`,
      ).toBe(2 * fixtureModules);
      const perModulePass = new Map<string, number>();
      for (const event of series.events) {
        const key = `${event.pass}:${event.sourcePath}`;
        perModulePass.set(key, (perModulePass.get(key) ?? 0) + 1);
      }
      const maxEventsPerModulePass = Math.max(...perModulePass.values());
      expect(
        maxEventsPerModulePass,
        `max_events_per_module_pass=${maxEventsPerModulePass}`,
      ).toBe(1);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac15_unsplit_refresh_keeps_fr7_counts",
    () => {
      expect(controlRun.error).toBeNull();
      expect(
        controlArchiveCalls,
        `projections=${controlArchiveCalls}`,
      ).toBe(1);
      expect(
        controlAnalyzerCalls,
        `analyzer_calls=${controlAnalyzerCalls}`,
      ).toBe(2);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac15_validation_adds_no_projection_or_analyzer_call",
    async () => {
      expect(stepRun.error).toBeNull();
      expect(
        stepValidateCounters,
        "the_run_printed_no_validate_step_line",
      ).not.toBeNull();
      const counters = stepValidateCounters as {
        analyzerCalls: number;
        archiveCalls: number;
      };
      expect(
        counters.analyzerCalls,
        `analyzer_calls_at_validate=${counters.analyzerCalls}`,
      ).toBe(stepEndCounters.analyzerCalls);
      expect(
        counters.archiveCalls,
        `archive_calls_at_validate=${counters.archiveCalls}`,
      ).toBe(stepEndCounters.archiveCalls);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac16_store_holds_a_record_for_each_pass",
    async () => {
      expect(partialStore).not.toBeNull();
      const store = partialStore as CheckpointStore;
      expect(store.passes.length, `passes=${store.passes.length}`).toBe(2);
      expect(
        Object.keys(store.passes[0].modules).length,
        `pass1_modules=${Object.keys(store.passes[0].modules).length}`,
      ).toBeGreaterThanOrEqual(1);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac16_pass_two_starts_after_pass_one_completes",
    async () => {
      expect(series.error).toBeNull();
      const firstPassTwo = series.events.findIndex(
        (event) => event.pass === 2,
      );
      const lastPassOne = series.events.reduce(
        (last, event, index) => (event.pass === 1 ? index : last),
        -1,
      );
      expect(firstPassTwo, `first_pass_two_event=${firstPassTwo}`).toBeGreaterThan(
        lastPassOne,
      );
      const firstRunInsidePassTwo = series.perRunEvents.findIndex((events) =>
        events.some((event) => event.pass === 2),
      );
      expect(
        firstRunInsidePassTwo,
        `first_run_inside_pass_two=${firstRunInsidePassTwo}`,
      ).toBeGreaterThanOrEqual(0);
      for (let index = firstRunInsidePassTwo + 1; index < series.perRunEvents.length; index += 1) {
        const passOneEvents = series.perRunEvents[index].filter(
          (event) => event.pass === 1,
        );
        expect(
          passOneEvents.length,
          `pass1_events_in_run=${index} count=${passOneEvents.length}`,
        ).toBe(0);
      }
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac16_changed_pass_two_finding_exits_2",
    async () => {
      expect(series.error).toBeNull();
      const completeStore = mergeStoreSnapshots(series.storeSnapshots);
      expect(
        completeStore,
        "the_series_produced_no_store_snapshot",
      ).not.toBeNull();
      const store = completeStore as CheckpointStore;
      const changedPath = Object.keys(store.passes[1].modules)[0];
      expect(changedPath, "the_pass_two_record_holds_no_module").toBeDefined();
      store.passes[1].modules[changedPath] = [
        ...(store.passes[1].modules[changedPath] ?? []),
        { semanticKey: "c".repeat(64), instanceKey: "d".repeat(64) },
      ];
      const root = await cloneFixture(base.root, "changed-pass-two");
      const bytesBefore = await readFile(
        resolve(root, V2_MANIFEST_PATH),
        "utf8",
      );
      await writeStore(root, store);
      const run = await runRefresh(
        root,
        ["--acknowledge", "--budget-s", "100000"],
        createRunControl({ batchModules: BATCH_MODULES }),
      );
      if (run.error) {
        expect(run.error.message).toContain(REPORT_MISMATCH_ERROR);
      } else {
        expect(run.exitCode, `exit_code=${run.exitCode}`).toBe(2);
        expect(`${run.stdout}${run.stderr}`).toContain(REPORT_MISMATCH_ERROR);
      }
      const bytesAfter = await readFile(
        resolve(root, V2_MANIFEST_PATH),
        "utf8",
      );
      expect(bytesAfter).toBe(bytesBefore);
    },
    FIXTURE_TIMEOUT_MS,
  );

  it(
    "ac17_documentation_names_budget_store_and_exit_3",
    async () => {
      const documentation = await readDocumentation();
      expect(documentation).toContain("--budget-s");
      expect(documentation).toContain(STORE_RELATIVE_PATH);
      expect(documentation).toMatch(/exit code 3|exit status 3|code 3/i);
    },
    FIXTURE_TIMEOUT_MS,
  );
});
