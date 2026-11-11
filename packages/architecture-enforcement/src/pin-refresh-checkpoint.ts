import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ArchitectureFinding } from "./contracts.js";

/** Repository-relative path of the resumable pin refresh store. */
export const PIN_REFRESH_CHECKPOINT_PATH =
  ".cache/architecture-pin-refresh/checkpoint.json";

/** Findings of every finished module of one pass, by source path. */
export interface PinRefreshCheckpointPass {
  /** Finished module findings, keyed by the exact source path. */
  modules: Record<string, ArchitectureFinding[]>;
}

/** One Git-commit-bound record of finished module findings. */
export interface PinRefreshCheckpointStore {
  /** Contract version of the store. */
  version: 1;
  /** Git commit identity from `git rev-parse HEAD`. */
  headCommit: string;
  /** Coding candidate paths; a usable store always holds none. */
  candidatePaths: string[];
  /** Exact source paths of the refresh. */
  sourcePaths: string[];
  /** Pass one and pass two records, in that order. */
  passes: [PinRefreshCheckpointPass, PinRefreshCheckpointPass];
}

/** Why a run discarded an unusable store. */
export type PinRefreshCheckpointDiscardReason =
  | "head_changed"
  | "unreadable"
  | "version"
  | "candidate_overlay"
  | "source_paths";

/** Result of reading the store before a run. */
export type PinRefreshCheckpointReadResult =
  | { status: "missing" }
  | { status: "usable"; store: PinRefreshCheckpointStore }
  | { status: "discarded"; reason: PinRefreshCheckpointDiscardReason };

/** Expected store identity of the current run. */
export interface PinRefreshCheckpointExpectation {
  /** Git commit identity of the current run. */
  headCommit: string;
  /** Exact source paths of the current projection. */
  sourcePaths: readonly string[];
}

/**
 * Tests whether one pass record holds a finding for every source path.
 * @param pass Stored record of one pass.
 * @param sourcePaths Exact source paths of the refresh.
 * @returns True when the pass holds a finding for every source path.
 */
export function isPinRefreshCheckpointPassComplete(
  pass: PinRefreshCheckpointPass,
  sourcePaths: readonly string[],
): boolean {
  return sourcePaths.every((sourcePath) =>
    Object.prototype.hasOwnProperty.call(pass.modules, sourcePath),
  );
}

/**
 * Reads and validates the store against the identity of the current run.
 * @param repoRoot Repository root that holds the store.
 * @param expectation Git commit and source paths of the current run.
 * @returns A usable store, a missing store, or the discard reason.
 */
export async function readPinRefreshCheckpoint(
  repoRoot: string,
  expectation: PinRefreshCheckpointExpectation,
): Promise<PinRefreshCheckpointReadResult> {
  const path = resolve(repoRoot, PIN_REFRESH_CHECKPOINT_PATH);
  let bytes: string;
  try {
    bytes = await readFile(path, "utf8");
  } catch (error) {
    const code = (error as { code?: string }).code;
    return code === "ENOENT"
      ? { status: "missing" }
      : { status: "discarded", reason: "unreadable" };
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(bytes);
  } catch {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "unreadable" };
  }
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "unreadable" };
  }
  const record = parsed as Record<string, unknown>;
  if (record.version !== 1) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "version" };
  }
  if (record.headCommit !== expectation.headCommit) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "head_changed" };
  }
  if (!Array.isArray(record.candidatePaths)) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "unreadable" };
  }
  if (record.candidatePaths.length > 0) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "candidate_overlay" };
  }
  if (
    !Array.isArray(record.sourcePaths) ||
    record.sourcePaths.length !== expectation.sourcePaths.length ||
    record.sourcePaths.some(
      (sourcePath, index) => sourcePath !== expectation.sourcePaths[index],
    )
  ) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "source_paths" };
  }
  if (!isCheckpointPasses(record.passes)) {
    await deletePinRefreshCheckpoint(repoRoot);
    return { status: "discarded", reason: "unreadable" };
  }
  return {
    status: "usable",
    store: {
      version: 1,
      headCommit: expectation.headCommit,
      candidatePaths: [],
      sourcePaths: [...expectation.sourcePaths],
      passes: record.passes,
    },
  };
}

/** Tests the shape of the two stored pass records. */
function isCheckpointPasses(
  value: unknown,
): value is [PinRefreshCheckpointPass, PinRefreshCheckpointPass] {
  if (!Array.isArray(value) || value.length !== 2) return false;
  return value.every((pass) => {
    if (pass === null || typeof pass !== "object" || Array.isArray(pass)) {
      return false;
    }
    const modules = (pass as Record<string, unknown>).modules;
    if (modules === null || typeof modules !== "object" || Array.isArray(modules)) {
      return false;
    }
    return Object.values(modules).every(
      (findings) => Array.isArray(findings),
    );
  });
}

/**
 * Writes the store through a temporary file and an atomic rename.
 * @param repoRoot Repository root that holds the store.
 * @param store Complete store record to persist.
 */
export async function writePinRefreshCheckpoint(
  repoRoot: string,
  store: PinRefreshCheckpointStore,
): Promise<void> {
  const path = resolve(repoRoot, PIN_REFRESH_CHECKPOINT_PATH);
  await mkdir(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(store, null, 2)}\n`, "utf8");
  await rename(temporaryPath, path);
}

/**
 * Deletes the store and any leftover temporary file.
 * @param repoRoot Repository root that holds the store.
 */
export async function deletePinRefreshCheckpoint(
  repoRoot: string,
): Promise<void> {
  const path = resolve(repoRoot, PIN_REFRESH_CHECKPOINT_PATH);
  await rm(path, { force: true });
  await rm(`${path}.tmp`, { force: true });
}
