/**
 * CI gate for generator correctness.
 *
 * Runs `verifyGenerator` on a batch of generator entries and produces a
 * `GateReport` with an `exitCode` suitable for `process.exit()`. This
 * module is domain-neutral — math-specific oracles belong in math-content.
 */

import {
  verifyGenerator,
  type VerifyGeneratorReport,
  type VerifyGeneratorOptions,
  type GeneratorLike,
} from './verify-generator.js';

// ── Types ────────────────────────────────────────────────────────────

export interface GateGeneratorEntry {
  /** Unique key identifying this generator (e.g. module path or registry key). */
  readonly key: string;
  /** The generator to verify. */
  readonly gen: GeneratorLike;
  /** Optional domain oracle forwarded to `verifyGenerator`. */
  readonly oracle?: VerifyGeneratorOptions['oracle'];
}

export interface GateOptions {
  /** Number of seeds per generator (default: 1). */
  readonly numSeeds?: number;
}

export interface GatePerGeneratorReport {
  /** The entry key. */
  readonly key: string;
  /** Per-generator verdict. */
  readonly verdict: 'pass' | 'fail';
  /** The underlying verification report. */
  readonly report: VerifyGeneratorReport;
}

export interface GateReportSummary {
  readonly totalGenerators: number;
  readonly passedGenerators: number;
  readonly failedGenerators: number;
}

export interface GateReport {
  /** 0 when every generator passes, 1 otherwise (CI convention). */
  readonly exitCode: number;
  /** Aggregate verdict. */
  readonly verdict: 'pass' | 'fail';
  /** Per-generator results in input order. */
  readonly perGeneratorReports: readonly GatePerGeneratorReport[];
  /** Aggregate counts. */
  readonly summary: GateReportSummary;
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Run the generator verification gate across a batch of generators.
 * @param {readonly GateGeneratorEntry[]} entries - Array of generator entries to verify
 * @param {GateOptions} opts - Optional gate configuration
 * @returns {GateReport} - Gate report with per-generator results and exit code
 */
export function runGeneratorGate(
  entries: readonly GateGeneratorEntry[],
  opts: GateOptions = {},
): GateReport {
  const numSeeds = opts.numSeeds ?? 1;

  const perGeneratorReports: GatePerGeneratorReport[] = entries.map((entry) => {
    const report = verifyGenerator(entry.gen, {
      numSeeds,
      oracle: entry.oracle,
    });
    return {
      key: entry.key,
      verdict: report.verdict,
      report,
    };
  });

  const passedGenerators = perGeneratorReports.filter(
    (r) => r.verdict === 'pass',
  ).length;
  const failedGenerators = perGeneratorReports.length - passedGenerators;
  const verdict: 'pass' | 'fail' = failedGenerators === 0 ? 'pass' : 'fail';

  return {
    exitCode: verdict === 'pass' ? 0 : 1,
    verdict,
    perGeneratorReports,
    summary: {
      totalGenerators: entries.length,
      passedGenerators,
      failedGenerators,
    },
  };
}
