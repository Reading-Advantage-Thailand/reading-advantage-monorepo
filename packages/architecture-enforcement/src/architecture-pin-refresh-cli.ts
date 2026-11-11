#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { analyzeArchitectureSources } from "./analyzer.js";
import type { ArchitectureFinding } from "./contracts.js";
import {
  deletePinRefreshCheckpoint,
  readPinRefreshCheckpoint,
  writePinRefreshCheckpoint,
  type PinRefreshCheckpointStore,
} from "./pin-refresh-checkpoint.js";
import {
  computeAnalyzerImplementationTreeSha256V2,
  computeReconciliationImplementationTreeSha256V2,
} from "./reconciliation-manifest.js";
import {
  computeAnalyzerReconciliationEvidenceResumable,
  listCodingCandidatePaths,
  selectV2AnalyzerSourcePaths,
  validateAnalyzerReconciliationManifestV2,
  type ResumableAnalyzerEvidenceResult,
} from "./v2-manifest-validation.js";

const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const DEFAULT_BUDGET_SECONDS = 1500;
const DEFAULT_BATCH_MODULES = 250;
const REFRESHED_FIELDS = [
  "analyzerInputSnapshotSha256",
  "analyzerImplementationTreeSha256",
  "implementationAndTestTreeSha256",
  "reportSha256s",
] as const;
const PROGRESS_PREFIX = "architecture pin refresh: ";

/** Parsed local pin refresh command-line options. */
export interface PinRefreshCliOptions {
  /** Explicit consent required before the manifest may be written. */
  acknowledge: boolean;
  /** Time budget of one run, in whole seconds. */
  budgetSeconds: number;
  /** Exact repository root discovered for the command. */
  repoRoot: string;
}

/** Replaceable pin refresh dependencies used by direct CLI tests. */
export interface PinRefreshCliDependencies {
  /** Discovers a repository root when no explicit path is supplied. */
  discoverRepositoryRoot?: (cwd: string) => string;
  /** Writes successful command output. */
  writeStdout?: (output: string) => void;
  /** Writes a secret-safe command failure. */
  writeStderr?: (output: string) => void;
  /** Reads the run clock in milliseconds; defaults to `Date.now`. */
  now?: () => number;
  /** Number of modules analyzed in one batch; defaults to 250. */
  batchModules?: number;
  /** Test seam that fires once for each analyzed module. */
  onModuleAnalyzed?: (pass: 1 | 2, sourcePath: string) => void;
}

/** Writes successful output to the live process stream. */
function writeProcessStdout(output: string): void {
  process.stdout.write(output);
}

/** Writes failure output to the live process stream. */
function writeProcessStderr(output: string): void {
  process.stderr.write(output);
}

/** Discovers the containing git repository root. */
export function discoverPinRefreshRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/** Reads the commit identity that one store belongs to. */
function readHeadCommit(repoRoot: string): string {
  return execFileSync("git", ["rev-parse", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

/**
 * Parses strict pin refresh arguments with no implicit acknowledgement.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @param discoverRepositoryRoot Repository root discovery used by the command.
 * @returns Acknowledgement state, budget, and the repository root.
 * @throws When an unsupported argument or budget value is supplied.
 */
export function parsePinRefreshArguments(
  args: readonly string[],
  cwd: string,
  discoverRepositoryRoot: (
    cwd: string,
  ) => string = discoverPinRefreshRepositoryRoot,
): PinRefreshCliOptions {
  let acknowledge = false;
  let budgetSeconds = DEFAULT_BUDGET_SECONDS;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]!;
    if (argument === "--acknowledge") {
      acknowledge = true;
      continue;
    }
    if (argument === "--budget-s") {
      const value = args[index + 1];
      if (value === undefined || !/^[1-9]\d*$/.test(value)) {
        throw new Error(
          `Unsupported architecture pin refresh argument: ${argument}`,
        );
      }
      budgetSeconds = Number(value);
      index += 1;
      continue;
    }
    throw new Error(`Unsupported architecture pin refresh argument: ${argument}`);
  }
  return { acknowledge, budgetSeconds, repoRoot: discoverRepositoryRoot(cwd) };
}

/** Serializes JSON data with stable object-key ordering for the review subject. */
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
function computeReviewSubjectSha256(
  manifest: Record<string, unknown>,
): string {
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

/** Formats one manifest value for human preview output. */
function displayValue(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

/** Builds the store record from the module maps of this series. */
function buildStore(
  passMaps: readonly [
    Map<string, ArchitectureFinding[]>,
    Map<string, ArchitectureFinding[]>,
  ],
  headCommit: string,
  sourcePaths: readonly string[],
): PinRefreshCheckpointStore {
  return {
    version: 1,
    headCommit,
    candidatePaths: [],
    sourcePaths: [...sourcePaths],
    passes: [
      { modules: Object.fromEntries(passMaps[0]) },
      { modules: Object.fromEntries(passMaps[1]) },
    ],
  };
}

/**
 * Runs the preview-first local pin refresh command.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @param dependencies Replaceable root discovery, clock, and output writers.
 * @returns Zero when no write is pending or the write succeeds, one for a
 * pending preview, two on a failure, or three when the run must continue.
 */
export async function runArchitecturePinRefreshCli(
  args: readonly string[],
  cwd: string,
  dependencies: PinRefreshCliDependencies = {},
): Promise<0 | 1 | 2 | 3> {
  const options = parsePinRefreshArguments(
    args,
    cwd,
    dependencies.discoverRepositoryRoot,
  );
  const writeStdout = dependencies.writeStdout ?? writeProcessStdout;
  const writeStderr = dependencies.writeStderr ?? writeProcessStderr;
  const now = dependencies.now ?? Date.now;
  const batchModules = dependencies.batchModules ?? DEFAULT_BATCH_MODULES;
  const startedMs = now();
  const elapsedSeconds = (): number =>
    Math.max(0, Math.floor((now() - startedMs) / 1000));
  const writeProgress = (line: string): void => {
    writeStdout(`${PROGRESS_PREFIX}${line}\n`);
  };
  const manifestPath = resolve(options.repoRoot, V2_MANIFEST_PATH);
  const originalBytes = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(originalBytes) as Record<string, unknown>;
  const headCommit = readHeadCommit(options.repoRoot);
  const sourcePaths = selectV2AnalyzerSourcePaths(options.repoRoot);
  const candidateOverlay = listCodingCandidatePaths(options.repoRoot).length > 0;

  const passMaps: [
    Map<string, ArchitectureFinding[]>,
    Map<string, ArchitectureFinding[]>,
  ] = [new Map(), new Map()];
  let resumedFromStore = false;
  if (candidateOverlay) {
    writeProgress("checkpoint=off reason=candidate_overlay");
  } else {
    const stored = await readPinRefreshCheckpoint(options.repoRoot, {
      headCommit,
      sourcePaths,
    });
    if (stored.status === "usable") {
      resumedFromStore = true;
      for (const pass of [1, 2] as const) {
        for (const [sourcePath, findings] of Object.entries(
          stored.store.passes[pass - 1].modules,
        )) {
          passMaps[pass - 1].set(sourcePath, findings);
        }
      }
    } else if (stored.status === "discarded") {
      writeProgress(`checkpoint=discarded reason=${stored.reason}`);
    }
  }
  writeProgress(`step=store elapsed_s=${elapsedSeconds()}`);

  const budgetMs = options.budgetSeconds * 1000;
  let longestBatchMs = 0;
  let batchesInRun = 0;
  let lastCheckMs = startedMs;
  const shouldContinue = (): boolean => {
    const elapsedMs = now() - startedMs;
    lastCheckMs = now();
    if (candidateOverlay) return true;
    if (elapsedMs >= budgetMs) return false;
    if (batchesInRun === 0) return true;
    return elapsedMs + longestBatchMs <= budgetMs;
  };

  let result: ResumableAnalyzerEvidenceResult;
  try {
    result = await computeAnalyzerReconciliationEvidenceResumable(
      options.repoRoot,
      {
        analyzeSources: analyzeArchitectureSources,
        done: [passMaps[0], passMaps[1]],
        batchModules,
        shouldContinue,
        resumedFromStore,
        ...(dependencies.onModuleAnalyzed
          ? { onModuleAnalyzed: dependencies.onModuleAnalyzed }
          : {}),
        onStep: (step, pass) => {
          if (step === "prelude") {
            writeProgress(
              `step=prelude pass=${pass} elapsed_s=${elapsedSeconds()}`,
            );
            return;
          }
          writeProgress(`step=${step} elapsed_s=${elapsedSeconds()}`);
        },
        onBatch: async (
          pass: 1 | 2,
          results: ReadonlyMap<string, readonly ArchitectureFinding[]>,
        ) => {
          for (const [sourcePath, findings] of results) {
            passMaps[pass - 1].set(sourcePath, [...findings]);
          }
          batchesInRun += 1;
          const batchMs = now() - lastCheckMs;
          if (batchMs > longestBatchMs) longestBatchMs = batchMs;
          writeProgress(
            `step=modules pass=${pass} modules_done=${
              passMaps[pass - 1].size
            } modules_total=${sourcePaths.length} elapsed_s=${elapsedSeconds()}`,
          );
          if (!candidateOverlay) {
            await writePinRefreshCheckpoint(
              options.repoRoot,
              buildStore(passMaps, headCommit, sourcePaths),
            );
          }
        },
      },
    );
  } catch (error) {
    await deletePinRefreshCheckpoint(options.repoRoot);
    writeStderr(
      `Architecture pin refresh failed: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
    return 2;
  }

  if (result.status === "partial") {
    if (result.newModules === 0) {
      writeStderr(
        "Architecture pin refresh failed: the run stored no new module; increase --budget-s\n",
      );
      return 2;
    }
    writeProgress(
      `partial pass=${result.pass} modules_done=${result.modulesDone} modules_total=${result.modulesTotal}; run again with the same arguments`,
    );
    return 3;
  }

  const evidence = result.evidence;
  if (evidence.report.parseErrors.length > 0) {
    await deletePinRefreshCheckpoint(options.repoRoot);
    writeStderr(
      "Architecture pin refresh failed: Analyzer input holds parse errors; the manifest was not written\n",
    );
    return 2;
  }

  const refreshed: Record<string, unknown> = {
    ...manifest,
    analyzerInputSnapshotSha256: evidence.inputSnapshotSha256,
    analyzerImplementationTreeSha256:
      await computeAnalyzerImplementationTreeSha256V2(options.repoRoot),
    implementationAndTestTreeSha256:
      await computeReconciliationImplementationTreeSha256V2(options.repoRoot),
    reportSha256s: [evidence.reportSha256, evidence.reportSha256],
  };
  writeProgress(`step=trees elapsed_s=${elapsedSeconds()}`);
  refreshed.reviewSubjectSha256 = computeReviewSubjectSha256(refreshed);

  let changed = manifest.reviewSubjectSha256 !== refreshed.reviewSubjectSha256;
  for (const field of REFRESHED_FIELDS) {
    const previous = manifest[field];
    const next = refreshed[field];
    writeStdout(
      `${PROGRESS_PREFIX}${field}: ${displayValue(previous)} -> ${displayValue(next)}\n`,
    );
    if (canonicalJson(previous) !== canonicalJson(next)) changed = true;
  }

  if (!options.acknowledge) {
    writeStdout(
      changed
        ? "architecture pin refresh: preview only; rerun with --acknowledge to write\n"
        : "architecture pin refresh: no write required\n",
    );
    return changed ? 1 : 0;
  }
  await writeFile(
    manifestPath,
    `${JSON.stringify(refreshed, null, 2)}\n`,
    "utf8",
  );
  const validation = await validateAnalyzerReconciliationManifestV2({
    repoRoot: options.repoRoot,
    manifest: refreshed,
    evidence,
  });
  writeProgress(`step=validate elapsed_s=${elapsedSeconds()}`);
  if (!validation.valid) {
    await writeFile(manifestPath, originalBytes, "utf8");
    writeStderr(
      `Architecture pin refresh failed: ${validation.errors?.join("; ")}\n`,
    );
    return 2;
  }
  if (!candidateOverlay) {
    await deletePinRefreshCheckpoint(options.repoRoot);
  }
  writeStdout("architecture pin refresh: written\n");
  return 0;
}

/** Runs the guarded pin refresh CLI and converts failures into exit code two. */
export async function mainArchitecturePinRefreshCli(
  args: readonly string[],
  cwd: string,
  dependencies: PinRefreshCliDependencies = {},
): Promise<0 | 1 | 2 | 3> {
  try {
    return await runArchitecturePinRefreshCli(args, cwd, dependencies);
  } catch (error) {
    (dependencies.writeStderr ?? writeProcessStderr)(
      `Architecture pin refresh failed: ${
        error instanceof Error ? error.message : "unknown error"
      }\n`,
    );
    return 2;
  }
}

/** Tests whether this module is the directly invoked pin refresh entrypoint. */
export function isPinRefreshEntrypoint(
  moduleUrl: string,
  executablePath: string | undefined,
): boolean {
  return (
    executablePath !== undefined &&
    moduleUrl === pathToFileURL(executablePath).href
  );
}

/* v8 ignore start -- direct process wiring is exercised by the package script */
if (isPinRefreshEntrypoint(import.meta.url, process.argv[1])) {
  void mainArchitecturePinRefreshCli(process.argv.slice(2), process.cwd()).then(
    (exitCode) => {
      process.exitCode = exitCode;
    },
  );
}
/* v8 ignore stop */
