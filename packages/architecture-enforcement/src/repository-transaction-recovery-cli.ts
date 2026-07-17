#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
} from "./contracts.js";
import { createNodeRepositoryFileTransactionOperations } from "./node-file-transaction.js";
import {
  recoverRepositoryFileTransaction,
  type RecoverRepositoryFileTransactionOptions,
  type RepositoryFileTransactionRecoveryOutcome,
} from "./policy-update-transaction.js";

/** Parsed, explicitly acknowledged transaction-recovery options. */
export interface RepositoryTransactionRecoveryCliOptions {
  /** Repository root containing the retained lock and journal. */
  repoRoot: string;
  /** Exact transaction identifier printed by the interrupted operation. */
  transactionId: string;
  /** Explicit consent required for recovery mutations. */
  acknowledge: true;
}

/** Replaceable recovery boundaries used by the CLI entry point and its tests. */
export interface RepositoryTransactionRecoveryCliDependencies {
  /** Creates the fresh filesystem adapter used for recovery. */
  createFileOperations: typeof createNodeRepositoryFileTransactionOperations;
  /** Executes the acknowledged recovery operation. */
  recover: (
    options: RecoverRepositoryFileTransactionOptions,
  ) => Promise<RepositoryFileTransactionRecoveryOutcome>;
}

const defaultDependencies: RepositoryTransactionRecoveryCliDependencies = {
  createFileOperations: createNodeRepositoryFileTransactionOperations,
  recover: recoverRepositoryFileTransaction,
};

/** Discovers the containing Git repository root. */
export function discoverRecoveryRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/**
 * Parses the fail-closed recovery command line.
 * @param args User-supplied command arguments.
 * @param cwd Current process working directory.
 * @param discoverRoot Replaceable repository discovery boundary.
 * @returns Strict acknowledged recovery options.
 */
export function parseRepositoryTransactionRecoveryArguments(
  args: readonly string[],
  cwd: string,
  discoverRoot: (cwd: string) => string = discoverRecoveryRepositoryRoot,
): RepositoryTransactionRecoveryCliOptions {
  let acknowledge = false;
  let transactionId: string | undefined;
  let repoRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--acknowledge") {
      acknowledge = true;
    } else if (argument === "--transaction-id" || argument === "--repo-root") {
      const value = args[index + 1];
      if (!value) throw new Error(`${argument} requires a value`);
      if (argument === "--transaction-id") transactionId = value;
      else repoRoot = value;
      index += 1;
    } else {
      throw new Error(`Unsupported transaction recovery argument: ${argument}`);
    }
  }
  if (!acknowledge || !transactionId) {
    throw new Error(
      "Transaction recovery requires --acknowledge and --transaction-id",
    );
  }
  return {
    acknowledge: true,
    transactionId,
    repoRoot: repoRoot ?? discoverRoot(cwd),
  };
}

/** Validates a recovered architecture policy or domain baseline document. */
function validateRecoveredDocument(id: string, contents: string): void {
  const parsed: unknown = JSON.parse(contents);
  if (id === "ownership-map") {
    architectureConfigSchema.parse(parsed);
    return;
  }
  const baseline = architectureBaselineSchema.parse(parsed);
  if (
    (id === "database-baseline" && baseline.domain !== "database") ||
    (id === "provider-baseline" && baseline.domain !== "provider")
  ) {
    throw new Error(`Recovered ${id} declares the wrong domain`);
  }
}

/**
 * Runs one explicit recovery and writes a machine-readable result.
 * @param args User-supplied command arguments.
 * @param cwd Current process working directory.
 * @param writeOutput Replaceable output boundary.
 * @param dependencies Replaceable recovery boundaries.
 * @returns Zero after verified recovery.
 */
export async function runRepositoryTransactionRecoveryCli(
  args: readonly string[],
  cwd: string,
  writeOutput: (output: string) => void = (output) =>
    process.stdout.write(output),
  dependencies: RepositoryTransactionRecoveryCliDependencies = defaultDependencies,
): Promise<0> {
  const options = parseRepositoryTransactionRecoveryArguments(args, cwd);
  const outcome = await dependencies.recover({
    ...options,
    fileOperations: dependencies.createFileOperations(),
    validate: (replacement, contents) =>
      validateRecoveredDocument(replacement.id, contents),
  });
  writeOutput(`${JSON.stringify({ schemaVersion: 1, ...outcome }, null, 2)}\n`);
  return 0;
}

/**
 * Converts recovery failures into a stable non-zero process result.
 * @param args User-supplied command arguments.
 * @param cwd Current process working directory.
 * @param run Replaceable recovery runner.
 * @param writeError Replaceable diagnostic boundary.
 * @returns Zero on recovery success or two on a fail-closed error.
 */
export async function mainRepositoryTransactionRecoveryCli(
  args: readonly string[],
  cwd: string,
  run: typeof runRepositoryTransactionRecoveryCli = runRepositoryTransactionRecoveryCli,
  writeError: (output: string) => void = (output) =>
    process.stderr.write(output),
): Promise<0 | 2> {
  try {
    return await run(args, cwd);
  } catch (error) {
    writeError(
      `Architecture transaction recovery failed: ${error instanceof Error ? error.message : String(error)}\n`,
    );
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.exitCode = await mainRepositoryTransactionRecoveryCli(
    process.argv.slice(2),
    process.cwd(),
  );
}
