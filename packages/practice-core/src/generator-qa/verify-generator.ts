/**
 * Generator verification harness.
 *
 * Runs a set of correctness checks against a generator and produces a
 * structured report.  This module is domain-neutral — math-specific
 * oracles belong in math-content/app.
 */

import type { GeneratorCorrectnessContract } from './contract.js';

// ── Types ────────────────────────────────────────────────────────────

export interface VerifyGeneratorOptions {
  /** Number of seeds to test (default: 1). */
  readonly numSeeds?: number;
  /** Optional domain oracle that validates output beyond structural checks. */
  readonly oracle?: (output: GeneratorCorrectnessContract) => boolean;
}

export interface VerifyGeneratorCheck {
  /** Human-readable check name. */
  readonly name: string;
  /** Whether this check passed. */
  readonly passed: boolean;
  /** Optional detail message. */
  readonly message?: string;
}

export interface VerifyGeneratorError {
  /** Which check produced this error. */
  readonly checkName: string;
  /** Human-readable description of the failure. */
  readonly message: string;
}

export interface VerifyGeneratorSummary {
  /** Total checks executed. */
  readonly totalChecks: number;
  /** Checks that passed. */
  readonly passedChecks: number;
  /** Checks that failed. */
  readonly failedChecks: number;
}

export interface VerifyGeneratorReport {
  /** Overall verdict: "pass" if every check passed, "fail" otherwise. */
  readonly verdict: 'pass' | 'fail';
  /** Individual check results. */
  readonly checks: VerifyGeneratorCheck[];
  /** Failures extracted from checks. */
  readonly errors: VerifyGeneratorError[];
  /** Aggregate counts. */
  readonly summary: VerifyGeneratorSummary;
}

// ── Generator interface (structural, domain-neutral) ─────────────────

export interface GeneratorLike<TOutput = unknown> {
  generate(input: {
    readonly nodeId: string;
    readonly seed: number;
    readonly difficulty: number;
    readonly learnerContext?: Readonly<Record<string, unknown>>;
  }): TOutput;
}

// ── Helpers ──────────────────────────────────────────────────────────

/**
 * Run the determinism check across all seeds.
 * @param {GeneratorLike<unknown>} gen - Generator to test
 * @param {number} numSeeds - Number of seeds to test
 * @returns {VerifyGeneratorCheck} - Check result indicating pass or fail with message
 */
function runDeterminismCheck(gen: GeneratorLike<unknown>, numSeeds: number): VerifyGeneratorCheck {
  for (let i = 0; i < numSeeds; i++) {
    const input = { nodeId: 'test-node', seed: i, difficulty: 1 };
    const a = gen.generate(input);
    const b = gen.generate(input);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      return {
        name: 'determinism',
        passed: false,
        message: `Non-deterministic output for seed ${i}`,
      };
    }
  }
  return { name: 'determinism', passed: true };
}

/**
 * Run the unique-answer check across all seeds.
 * @param {GeneratorLike<unknown>} gen - Generator to test
 * @param {number} numSeeds - Number of seeds to test
 * @param {(output: GeneratorCorrectnessContract) => boolean} oracle - Optional domain oracle to validate correct answers
 * @returns {VerifyGeneratorCheck} - Check result indicating pass or fail with message
 */
function runUniqueAnswerCheck(
  gen: GeneratorLike<unknown>,
  numSeeds: number,
  oracle?: (output: GeneratorCorrectnessContract) => boolean,
): VerifyGeneratorCheck {
  for (let i = 0; i < numSeeds; i++) {
    const input = { nodeId: 'test-node', seed: i, difficulty: 1 };
    const output = gen.generate(input) as GeneratorCorrectnessContract;

    // Skip if output doesn't conform to GeneratorCorrectnessContract
    const rec = output as unknown as Record<string, unknown>;
    if (!('correctAnswer' in rec)) {
      continue;
    }

    if (output.correctAnswer === undefined || output.correctAnswer === null) {
      return {
        name: 'unique-answer',
        passed: false,
        message: `Missing correctAnswer for seed ${i}`,
      };
    }

    if (oracle) {
      if (!oracle(output)) {
        return {
          name: 'unique-answer',
          passed: false,
          message: `Oracle rejected correctAnswer for seed ${i}`,
        };
      }
    }
  }
  return { name: 'unique-answer', passed: true };
}

/**
 * Run the distractor validity check across all seeds.
 * @param {GeneratorLike<unknown>} gen - Generator to test
 * @param {number} numSeeds - Number of seeds to test
 * @returns {VerifyGeneratorCheck} - Check result indicating pass or fail with message
 */
function runDistractorValidityCheck(gen: GeneratorLike<unknown>, numSeeds: number): VerifyGeneratorCheck {
  for (let i = 0; i < numSeeds; i++) {
    const input = { nodeId: 'test-node', seed: i, difficulty: 1 };
    const output = gen.generate(input) as GeneratorCorrectnessContract;

    // Skip if output doesn't conform to GeneratorCorrectnessContract
    const rec = output as unknown as Record<string, unknown>;
    if (!('distractors' in rec)) {
      continue;
    }

    if (!Array.isArray(output.distractors)) {
      return {
        name: 'distractor-validity',
        passed: false,
        message: `distractors is not an array for seed ${i}`,
      };
    }

    const correct = output.correctAnswer;
    const correctType = typeof correct;

    const seen = new Set<unknown>([correct]);
    for (const d of output.distractors) {
      if (d === correct) {
        return {
          name: 'distractor-validity',
          passed: false,
          message: `Distractor collides with correctAnswer for seed ${i}`,
        };
      }
      if (seen.has(d)) {
        return {
          name: 'distractor-validity',
          passed: false,
          message: `Duplicate distractor for seed ${i}`,
        };
      }
      if (typeof d !== correctType) {
        return {
          name: 'distractor-validity',
          passed: false,
          message: `Distractor type mismatch for seed ${i}`,
        };
      }
      seen.add(d);
    }
  }
  return { name: 'distractor-validity', passed: true };
}

/**
 * Run the invariants check across all seeds.
 * @param {GeneratorLike<unknown>} gen - Generator to test
 * @param {number} numSeeds - Number of seeds to test
 * @returns {VerifyGeneratorCheck} - Check result indicating pass or fail with message
 */
function runInvariantsCheck(gen: GeneratorLike<unknown>, numSeeds: number): VerifyGeneratorCheck {
  for (let i = 0; i < numSeeds; i++) {
    const input = { nodeId: 'test-node', seed: i, difficulty: 1 };
    const output = gen.generate(input) as GeneratorCorrectnessContract;

    // Skip if output doesn't conform to GeneratorCorrectnessContract
    const rec = output as unknown as Record<string, unknown>;
    if (!('invariants' in rec)) {
      continue;
    }

    if (!output.invariants || !Array.isArray(output.invariants)) {
      continue;
    }

    for (const raw of output.invariants) {
      const inv = raw as { readonly name?: string; readonly passed?: boolean };
      if (inv.passed === false) {
        return {
          name: 'invariants',
          passed: false,
          message: `Invariant "${inv.name ?? 'unknown'}" failed for seed ${i}`,
        };
      }
    }
  }
  return { name: 'invariants', passed: true };
}

// ── Public API ───────────────────────────────────────────────────────

/**
 * Run all correctness checks against a generator and produce a report.
 * @param {GeneratorLike<unknown>} gen - Generator to verify
 * @param {VerifyGeneratorOptions} opts - Optional configuration for seeds and domain oracle
 * @returns {VerifyGeneratorReport} - Verification report with verdict, checks, errors, and summary
 */
export function verifyGenerator(
  gen: GeneratorLike<unknown>,
  opts: VerifyGeneratorOptions = {},
): VerifyGeneratorReport {
  const numSeeds = opts.numSeeds ?? 1;
  const checks: VerifyGeneratorCheck[] = [];

  // FR2: Determinism check (always runs)
  checks.push(runDeterminismCheck(gen, numSeeds));

  // FR3: Unique correct answer check
  checks.push(runUniqueAnswerCheck(gen, numSeeds, opts.oracle));

  // FR4: Distractor validity check
  checks.push(runDistractorValidityCheck(gen, numSeeds));

  // FR5: Solvability / range invariants check
  checks.push(runInvariantsCheck(gen, numSeeds));

  const errors: VerifyGeneratorError[] = checks
    .filter((c) => !c.passed)
    .map((c) => ({
      checkName: c.name,
      message: c.message ?? `${c.name} check failed`,
    }));

  const passedChecks = checks.filter((c) => c.passed).length;

  return {
    verdict: errors.length === 0 ? 'pass' : 'fail',
    checks,
    errors,
    summary: {
      totalChecks: checks.length,
      passedChecks,
      failedChecks: checks.length - passedChecks,
    },
  };
}
