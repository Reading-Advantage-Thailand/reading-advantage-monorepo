import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  analyzeArchitectureSources,
  type ArchitectureAnalyzerError,
} from "./analyzer.js";
import { computeRulesetHash } from "./baseline.js";
import {
  architectureBaselineSchema,
  architectureConfigSchema,
  type ArchitectureBaseline,
  type ArchitectureConfig,
  type ArchitectureFinding,
} from "./contracts.js";
import { selectArchitectureSourceFiles } from "./inventory.js";
import { loadOwnershipMap } from "./ownership-map.js";
import {
  compareArchitectureDebt,
  formatArchitectureComparison,
  type ArchitectureBaselines,
  type ArchitectureComparison,
} from "./ratchet.js";
import { compareStableStrings } from "./stable-order.js";
import {
  loadWorkspaceModuleTargets,
  type WorkspaceModuleTargets,
} from "./workspace-resolution.js";

/** Stable outcomes emitted by the repository architecture checker. */
export type ArchitectureCheckStatus =
  | "clean"
  | "debt-change"
  | "analysis-error";

/** Deterministic, secret-safe report shared by human and JSON CLI output. */
export interface ArchitectureCheckReport {
  /** Version of the architecture check report contract. */
  schemaVersion: 1;
  /** Overall result used to select the documented process exit code. */
  status: ArchitectureCheckStatus;
  /** Number of tracked TypeScript and JavaScript sources analyzed. */
  filesScanned: number;
  /** Current validated architecture findings in canonical order. */
  findings: ArchitectureFinding[];
  /** Fail-closed parser or resolver diagnostics in canonical order. */
  parseErrors: ArchitectureAnalyzerError[];
  /** Debt comparison, omitted when analysis could not complete safely. */
  comparison?: ArchitectureComparison;
}

/** Options accepted by the read-only repository architecture checker. */
export interface CheckArchitectureRepositoryOptions {
  /** Absolute repository root containing policy, sources, and baselines. */
  repoRoot: string;
  /** Optional validated policy override used by isolated tests. */
  config?: ArchitectureConfig;
  /** Optional exact source list used by isolated tests. */
  sourcePaths?: readonly string[];
  /** Optional workspace export targets used by isolated tests. */
  workspaceTargets?: WorkspaceModuleTargets;
  /** Optional exact resolver configuration path relative to the repository. */
  resolverConfigPath?: string;
}

/** Converts one domain baseline into its canonical configured baseline path. */
function baselinePath(
  config: ArchitectureConfig,
  domain: ArchitectureBaseline["domain"],
): string {
  return config.baselineFiles[domain];
}

/** Reads one strict baseline without changing repository state. */
async function readArchitectureBaseline(
  repoRoot: string,
  path: string,
): Promise<ArchitectureBaseline> {
  const source = await readFile(resolve(repoRoot, path), "utf8");
  return architectureBaselineSchema.parse(JSON.parse(source));
}

/**
 * Reads and validates both configured architecture baselines.
 * @param repoRoot Absolute repository root containing the baseline files.
 * @param config Validated architecture policy with exact baseline paths.
 * @returns Strict database and provider baselines.
 * @throws When a baseline is unreadable, malformed, or stale against policy.
 */
export async function readArchitectureBaselines(
  repoRoot: string,
  config: ArchitectureConfig,
): Promise<ArchitectureBaselines> {
  const validatedConfig = architectureConfigSchema.parse(config);
  const [database, provider] = await Promise.all([
    readArchitectureBaseline(
      repoRoot,
      baselinePath(validatedConfig, "database"),
    ),
    readArchitectureBaseline(
      repoRoot,
      baselinePath(validatedConfig, "provider"),
    ),
  ]);
  for (const baseline of [database, provider]) {
    const expectedHash = computeRulesetHash(validatedConfig, baseline.domain);
    if (baseline.rulesetHash !== expectedHash) {
      throw new Error(
        `${baseline.domain} baseline ruleset hash does not match current policy`,
      );
    }
  }
  return { database, provider };
}

/** Sorts analyzer errors into a stable machine-independent order. */
function sortAnalyzerErrors(
  errors: readonly ArchitectureAnalyzerError[],
): ArchitectureAnalyzerError[] {
  return [...errors].sort(
    (left, right) =>
      compareStableStrings(left.sourcePath, right.sourcePath) ||
      left.line - right.line ||
      left.column - right.column ||
      compareStableStrings(left.code, right.code),
  );
}

/**
 * Runs the complete read-only architecture analysis and debt comparison.
 * @param options Repository, policy, and optional isolated source overrides.
 * @returns Deterministic report without writing a baseline or generated file.
 */
export async function checkArchitectureRepository(
  options: CheckArchitectureRepositoryOptions,
): Promise<ArchitectureCheckReport> {
  const config = architectureConfigSchema.parse(
    options.config ?? loadOwnershipMap(),
  );
  const sourcePaths = options.sourcePaths
    ? [...options.sourcePaths]
    : selectArchitectureSourceFiles(
        { repoRoot: options.repoRoot },
        options.repoRoot,
      );
  const workspaceTargets =
    options.workspaceTargets ??
    (await loadWorkspaceModuleTargets(options.repoRoot));
  const baselines = await readArchitectureBaselines(options.repoRoot, config);
  const analysis = await analyzeArchitectureSources({
    repoRoot: options.repoRoot,
    sourcePaths,
    config,
    workspaceTargets,
    ...(options.resolverConfigPath
      ? { resolverConfigPath: options.resolverConfigPath }
      : {}),
  });
  const parseErrors = sortAnalyzerErrors(analysis.parseErrors);
  if (parseErrors.length > 0) {
    return {
      schemaVersion: 1,
      status: "analysis-error",
      filesScanned: analysis.sourcePaths.length,
      findings: analysis.findings,
      parseErrors,
    };
  }
  const comparison = compareArchitectureDebt({
    baselines,
    findings: analysis.findings,
  });
  return {
    schemaVersion: 1,
    status: comparison.status === "clean" ? "clean" : "debt-change",
    filesScanned: analysis.sourcePaths.length,
    findings: analysis.findings,
    parseErrors,
    comparison,
  };
}

/**
 * Selects the documented checker process exit code.
 * @param report Deterministic architecture check report.
 * @returns Zero for clean, one for debt change, or two for analysis failure.
 */
export function architectureCheckExitCode(
  report: ArchitectureCheckReport,
): 0 | 1 | 2 {
  if (report.status === "analysis-error") return 2;
  return report.status === "clean" ? 0 : 1;
}

/**
 * Serializes a checker report to byte-stable pretty JSON.
 * @param report Architecture check report to serialize.
 * @returns Stable JSON terminated by one newline.
 */
export function serializeArchitectureCheckReport(
  report: ArchitectureCheckReport,
): string {
  return `${JSON.stringify(report, null, 2)}\n`;
}

/**
 * Formats concise human diagnostics without source bodies or credentials.
 * @param report Architecture check report to format.
 * @returns Stable line-oriented CLI output.
 */
export function formatArchitectureCheckReport(
  report: ArchitectureCheckReport,
): string {
  const lines = [
    `architecture check: ${report.status} (files=${report.filesScanned}, findings=${report.findings.length}, parseErrors=${report.parseErrors.length})`,
  ];
  for (const error of report.parseErrors) {
    lines.push(
      `! ${error.code} ${error.sourcePath}:${error.line}:${error.column}`,
    );
  }
  if (report.comparison) {
    lines.push(formatArchitectureComparison(report.comparison).trimEnd());
  }
  return `${lines.join("\n")}\n`;
}
