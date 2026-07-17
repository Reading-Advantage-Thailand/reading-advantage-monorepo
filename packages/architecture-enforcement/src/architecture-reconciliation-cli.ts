#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  applyArchitectureReconciliation,
  previewArchitectureReconciliation,
  type ArchitectureReconciliationApplyResult,
  type ArchitectureReconciliationPreview,
  type ArchitectureReconciliationSummary,
} from "./architecture-reconciliation.js";

/** Output representations supported by the one-time reconciliation command. */
export type ArchitectureReconciliationCliFormat = "human" | "json";

/** Strict command-line options for previewing or applying reconciliation. */
export interface ArchitectureReconciliationCliOptions {
  /** Whether the exact previewed transaction may be applied. */
  acknowledge: boolean;
  /** Reviewed wrapper hash required for an acknowledged apply. */
  expectedPlanHash?: string;
  /** Human-readable or structured output. */
  format: ArchitectureReconciliationCliFormat;
  /** Absolute repository root containing reconciliation inputs. */
  repoRoot: string;
}

/** Replaceable command boundaries used by production and isolated tests. */
export interface ArchitectureReconciliationCliDependencies {
  /** Applies one explicitly acknowledged preview. */
  apply(
    preview: ArchitectureReconciliationPreview,
    expectedPlanHash: string,
  ): Promise<ArchitectureReconciliationApplyResult>;
  /** Finds the containing repository root. */
  discoverRepositoryRoot(cwd: string): string;
  /** Builds the mutation-free reconciliation preview. */
  preview(repoRoot: string): Promise<ArchitectureReconciliationPreview>;
  /** Writes one complete diagnostic to standard error. */
  writeStderr(value: string): void;
  /** Writes one complete result to standard output. */
  writeStdout(value: string): void;
}

/** Discovers the containing git repository root. */
function discoverRepositoryRoot(cwd: string): string {
  return execFileSync("git", ["rev-parse", "--show-toplevel"], {
    cwd,
    encoding: "utf8",
  }).trim();
}

/** Resolves production command dependencies without partial undefined values. */
function resolveDependencies(
  overrides: Partial<ArchitectureReconciliationCliDependencies> | undefined,
): ArchitectureReconciliationCliDependencies {
  return {
    apply:
      overrides?.apply ??
      ((preview, expectedPlanHash) =>
        applyArchitectureReconciliation({
          preview,
          acknowledge: true,
          expectedReconciliationPlanHash: expectedPlanHash,
        })),
    discoverRepositoryRoot:
      overrides?.discoverRepositoryRoot ?? discoverRepositoryRoot,
    preview:
      overrides?.preview ??
      ((repoRoot) => previewArchitectureReconciliation({ repoRoot })),
    writeStderr:
      overrides?.writeStderr ?? ((value) => process.stderr.write(value)),
    writeStdout:
      overrides?.writeStdout ?? ((value) => process.stdout.write(value)),
  };
}

/**
 * Parses strict reconciliation command-line arguments.
 * @param args User-supplied arguments after the executable name.
 * @param cwd Current working directory used for repository discovery.
 * @param discover Root discovery boundary used when no root is supplied.
 * @returns Validated preview or acknowledged-apply options.
 * @throws When an argument, format, or acknowledgement combination is invalid.
 */
export function parseArchitectureReconciliationArguments(
  args: readonly string[],
  cwd: string,
  discover: (cwd: string) => string = discoverRepositoryRoot,
): ArchitectureReconciliationCliOptions {
  let acknowledge = false;
  let expectedPlanHash: string | undefined;
  let format: ArchitectureReconciliationCliFormat = "human";
  let repoRoot: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--acknowledge") {
      acknowledge = true;
    } else if (argument === "--expected-plan-hash") {
      const value = args[index + 1];
      if (!value || !/^[a-f0-9]{64}$/.test(value)) {
        throw new Error(
          "--expected-plan-hash requires a lowercase SHA-256 digest",
        );
      }
      expectedPlanHash = value;
      index += 1;
    } else if (argument === "--format") {
      const value = args[index + 1];
      if (value !== "human" && value !== "json") {
        throw new Error("--format must be human or json");
      }
      format = value;
      index += 1;
    } else if (argument === "--repo-root") {
      const value = args[index + 1];
      if (!value) throw new Error("--repo-root requires a path");
      repoRoot = value;
      index += 1;
    } else {
      throw new Error(
        `Unsupported architecture reconciliation argument: ${argument}`,
      );
    }
  }
  if (acknowledge !== (expectedPlanHash !== undefined)) {
    throw new Error(
      "--acknowledge and --expected-plan-hash must be supplied together",
    );
  }
  return {
    acknowledge,
    ...(expectedPlanHash ? { expectedPlanHash } : {}),
    format,
    repoRoot: repoRoot ?? discover(cwd),
  };
}

/** Formats a secret-safe human preview or apply result. */
function formatHuman(
  state: "preview-required" | "committed" | "committed-cleanup-incomplete",
  summary: ArchitectureReconciliationSummary,
): string {
  return [
    `Architecture reconciliation state: ${state}`,
    `Architecture reconciliation plan hash: ${summary.reconciliationPlanHash}`,
    `Architecture transaction plan hash: ${summary.transactionPlanHash}`,
    `Architecture manifest hash: ${summary.manifestHash}`,
    `Architecture reconciliation implementation tree hash: ${summary.reconciliationImplementationTreeHash}`,
    `Architecture production additions: ${summary.counts.productionAdditions}`,
    `Architecture exact exception additions: ${summary.counts.exactExceptionAdditions}`,
    `Architecture covered test findings: ${summary.counts.coveredTestFindings}`,
    `Architecture removals: ${summary.counts.removals}`,
    `Architecture renames: ${summary.counts.renames}`,
    `Architecture database entries: ${summary.counts.databaseEntries}`,
    `Architecture provider entries: ${summary.counts.providerEntries}`,
    `Architecture exact exception pairs: ${summary.exactExceptionPairs.map((pair) => `${pair.ruleId}:${pair.sourcePath}`).join(",")}`,
    "",
  ].join("\n");
}

/**
 * Runs the preview-first one-time architecture reconciliation command.
 * @param args User-supplied command-line arguments.
 * @param cwd Current process working directory.
 * @param overrides Optional isolated command boundaries.
 * @returns Zero only after a complete acknowledged commit, one for preview, or two for committed cleanup warnings.
 */
export async function runArchitectureReconciliationCli(
  args: readonly string[],
  cwd: string,
  overrides?: Partial<ArchitectureReconciliationCliDependencies>,
): Promise<number> {
  const dependencies = resolveDependencies(overrides);
  const options = parseArchitectureReconciliationArguments(
    args,
    cwd,
    dependencies.discoverRepositoryRoot,
  );
  const preview = await dependencies.preview(options.repoRoot);
  if (!options.acknowledge) {
    const result = {
      state: "preview-required" as const,
      summary: preview.summary,
    };
    dependencies.writeStdout(
      options.format === "json"
        ? `${JSON.stringify(result, null, 2)}\n`
        : formatHuman(result.state, result.summary),
    );
    dependencies.writeStderr(
      "Architecture reconciliation preview wrote nothing; review the plan hash and rerun with explicit acknowledgement.\n",
    );
    return 1;
  }
  const applied = await dependencies.apply(preview, options.expectedPlanHash!);
  if (applied.transactionOutcome.state === "not-acknowledged") {
    throw new Error(
      "Acknowledged reconciliation returned a non-writing outcome",
    );
  }
  const state = applied.transactionOutcome.state;
  dependencies.writeStdout(
    options.format === "json"
      ? `${JSON.stringify({ state, summary: applied.summary }, null, 2)}\n`
      : formatHuman(state, applied.summary),
  );
  if (state === "committed-cleanup-incomplete") {
    dependencies.writeStderr(
      "Architecture reconciliation committed, but recovery-artifact cleanup requires operator attention; do not retry.\n",
    );
    return 2;
  }
  return 0;
}

const isExecutable =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isExecutable) {
  try {
    process.exitCode = await runArchitectureReconciliationCli(
      process.argv.slice(2),
      process.cwd(),
    );
  } catch (error) {
    process.stderr.write(
      `Architecture reconciliation failed: ${error instanceof Error ? error.message : "unknown error"}\n`,
    );
    process.exitCode = 1;
  }
}
