#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import {
  computeAnalyzerImplementationTreeSha256V2,
  computeReconciliationImplementationTreeSha256V2,
} from "./reconciliation-manifest.js";
import { analyzeArchitectureSources } from "./analyzer.js";
import {
  computeAnalyzerReconciliationEvidence,
  validateAnalyzerReconciliationManifestV2,
} from "./v2-manifest-validation.js";

const V2_MANIFEST_PATH =
  "packages/architecture-enforcement/src/config/analyzer-reconciliation.v2.json";
const REFRESHED_FIELDS = [
  "analyzerInputSnapshotSha256",
  "analyzerImplementationTreeSha256",
  "implementationAndTestTreeSha256",
  "reportSha256s",
] as const;

/** Parsed local pin refresh command-line options. */
export interface PinRefreshCliOptions {
  /** Explicit consent required before the manifest may be written. */
  acknowledge: boolean;
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

/**
 * Parses strict pin refresh arguments with no implicit acknowledgement.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @param discoverRepositoryRoot Repository root discovery used by the command.
 * @returns Explicit acknowledgement state and the repository root.
 * @throws When an unsupported argument is supplied.
 */
export function parsePinRefreshArguments(
  args: readonly string[],
  cwd: string,
  discoverRepositoryRoot: (
    cwd: string,
  ) => string = discoverPinRefreshRepositoryRoot,
): PinRefreshCliOptions {
  let acknowledge = false;
  for (const argument of args) {
    if (argument === "--acknowledge") {
      acknowledge = true;
    } else {
      throw new Error(`Unsupported architecture pin refresh argument: ${argument}`);
    }
  }
  return { acknowledge, repoRoot: discoverRepositoryRoot(cwd) };
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

/**
 * Runs the preview-first local pin refresh command.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @param dependencies Replaceable root discovery and output writers.
 * @returns Zero when no write is pending or the write succeeds, one for a
 * pending preview, or two on an analysis or validation failure.
 */
export async function runArchitecturePinRefreshCli(
  args: readonly string[],
  cwd: string,
  dependencies: PinRefreshCliDependencies = {},
): Promise<0 | 1 | 2> {
  const options = parsePinRefreshArguments(
    args,
    cwd,
    dependencies.discoverRepositoryRoot,
  );
  const writeStdout = dependencies.writeStdout ?? writeProcessStdout;
  const writeStderr = dependencies.writeStderr ?? writeProcessStderr;
  const manifestPath = resolve(options.repoRoot, V2_MANIFEST_PATH);
  const originalBytes = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(originalBytes) as Record<string, unknown>;

  const evidence = await computeAnalyzerReconciliationEvidence(
    options.repoRoot,
    analyzeArchitectureSources,
  );
  if (evidence.report.parseErrors.length > 0) {
    throw new Error(
      "Analyzer input holds parse errors; the manifest was not written",
    );
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
  refreshed.reviewSubjectSha256 = computeReviewSubjectSha256(refreshed);

  let changed = manifest.reviewSubjectSha256 !== refreshed.reviewSubjectSha256;
  for (const field of REFRESHED_FIELDS) {
    const previous = manifest[field];
    const next = refreshed[field];
    writeStdout(
      `architecture pin refresh: ${field}: ${displayValue(previous)} -> ${displayValue(next)}\n`,
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
  if (!validation.valid) {
    await writeFile(manifestPath, originalBytes, "utf8");
    writeStderr(
      `Architecture pin refresh failed: ${validation.errors?.join("; ")}\n`,
    );
    return 2;
  }
  writeStdout("architecture pin refresh: written\n");
  return 0;
}

/** Runs the guarded pin refresh CLI and converts failures into exit code two. */
export async function mainArchitecturePinRefreshCli(
  args: readonly string[],
  cwd: string,
  dependencies: PinRefreshCliDependencies = {},
): Promise<0 | 1 | 2> {
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
