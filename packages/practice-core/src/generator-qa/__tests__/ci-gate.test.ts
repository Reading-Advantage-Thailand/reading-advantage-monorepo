// Phase-4 CI gate proof tests — Red phase (TDD).
//
// Contract under test (per test-strategy.md §5, Phase 4):
//
//   "Add `npm run test:generators` script; wire into root CI. Proof test:
//    temporarily registers a known-bad generator, asserts exit code ≠ 0,
//    then deregisters."
//
// The `runGeneratorGate` module (../gate) does not exist yet; the value
// imports on `runGeneratorGate`, `GateReport`, `GateGeneratorEntry`, and
// `GateOptions` force a module-resolution failure, failing every test in
// this file. The harness core already exposes `verifyGenerator` (used
// internally by the gate in the Green phase) plus the four Phase-2
// property checks (FR2 determinism, FR3 unique answer, FR4 distractor
// validity, FR5 solvability invariants). The Green-phase implementation
// of `runGeneratorGate` is a thin batch wrapper that:
//
//   1. Iterates the supplied entries (key + gen + optional oracle).
//   2. Runs `verifyGenerator(gen, { numSeeds, oracle })` for each.
//   3. Computes a `GateReport` with `exitCode` (0 on all-pass, non-zero
//      on any violation), per-generator verdicts, and aggregate summary.
//   4. Exits the process with `exitCode` so the script can be invoked
//      from CI (`process.exit(runGeneratorGate(entries).exitCode)`).
//
// The proof test ("block-on-violation") temporarily appends a known-bad
// generator (FR2 non-deterministic) to a list that also contains a
// well-formed one and asserts `exitCode !== 0`. In the in-memory API
// shape we use here, "register" means "include in the entries array";
// the implementation does not need a global registry to satisfy the
// proof.
//
// Red signal: this file fails to load because `../gate` does not exist.
// Existing practice-core tests (13 files, 134 tests) continue to pass.

import { describe, it, expect, expectTypeOf } from 'vitest';

import {
  runGeneratorGate,
  type GateReport,
  type GateGeneratorEntry,
  type GateOptions,
} from '../gate.js'; // Intentional: non-existent module → Red.

import { createStubGenerator } from './fixtures/stubGenerator.js';
import { createNonDeterministicGenerator } from './fixtures/badGenerators.js';
import type { VerifyGeneratorReport } from '../verify-generator.js';

// ---------------------------------------------------------------------------
// Local re-cast of StubGenerator to satisfy the gate's `GeneratorLike`
// contract. The stub fixture's input shape is structurally identical to
// `GeneratorLike['generate']`'s first parameter, so the cast is safe.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// Type-only sanity (AC1 surface).
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4 FR7) — API surface', () => {
  it('exports runGeneratorGate as a function', () => {
    expect(typeof runGeneratorGate).toBe('function');
  });

  it('exposes GateReport with exitCode, verdict, perGeneratorReports, summary', () => {
    expectTypeOf<GateReport>().toHaveProperty('exitCode');
    expectTypeOf<GateReport>().toHaveProperty('verdict');
    expectTypeOf<GateReport>().toHaveProperty('perGeneratorReports');
    expectTypeOf<GateReport>().toHaveProperty('summary');
  });

  it('exposes GateGeneratorEntry with key, gen, and optional oracle', () => {
    expectTypeOf<GateGeneratorEntry>().toHaveProperty('key');
    expectTypeOf<GateGeneratorEntry>().toHaveProperty('gen');
    expectTypeOf<GateGeneratorEntry>().toHaveProperty('oracle');
  });

  it('exposes GateOptions with optional numSeeds', () => {
    expectTypeOf<GateOptions>().toHaveProperty('numSeeds');
  });

  it('verdict is the literal union "pass" | "fail"', () => {
    expectTypeOf<GateReport['verdict']>().toEqualTypeOf<'pass' | 'fail'>();
  });

  it('exitCode is a number (CI-style process exit code)', () => {
    expectTypeOf<GateReport['exitCode']>().toEqualTypeOf<number>();
  });
});

// ---------------------------------------------------------------------------
// Happy path: all-passing list yields a passing gate report.
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4 FR7) — happy path (AC1, AC4)', () => {
  it('returns exitCode 0 for an all-passing list', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'stub', gen: createStubGenerator() },
    ];
    const report = runGeneratorGate(entries);
    expect(report.exitCode).toBe(0);
  });

  it('returns verdict "pass" for an all-passing list', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'stub', gen: createStubGenerator() },
    ];
    const report = runGeneratorGate(entries);
    expect(report.verdict).toBe('pass');
  });

  it('summary.passedGenerators equals entries.length on the all-passing path', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'stub', gen: createStubGenerator() },
    ];
    const report = runGeneratorGate(entries);
    expect(report.summary.totalGenerators).toBe(1);
    expect(report.summary.passedGenerators).toBe(1);
    expect(report.summary.failedGenerators).toBe(0);
  });

  it('perGeneratorReports mirrors the entries in input order', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'stub', gen: createStubGenerator() },
    ];
    const report = runGeneratorGate(entries);
    expect(report.perGeneratorReports).toHaveLength(1);
    expect(report.perGeneratorReports[0]?.key).toBe('stub');
    expect(report.perGeneratorReports[0]?.verdict).toBe('pass');
    // The per-generator report embeds the underlying VerifyGeneratorReport.
    const embedded = report.perGeneratorReports[0]?.report as
      | VerifyGeneratorReport
      | undefined;
    expect(embedded?.verdict).toBe('pass');
  });
});

// ---------------------------------------------------------------------------
// THE proof test: a known-bad generator in the list MUST block CI.
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4 FR7) — block-on-violation proof test (AC4)', () => {
  it('returns exitCode non-zero when a known-bad generator is registered (FR2 violator)', () => {
    // The "register" step: append the FR2 violator to the entries.
    const entries: GateGeneratorEntry[] = [
      { key: 'stub', gen: createStubGenerator() },
      // The bad generator — uses Math.random(), fails determinism.
      { key: 'non-deterministic', gen: createNonDeterministicGenerator() },
    ];
    // The "assert exit code" step: gate must report non-zero.
    const report = runGeneratorGate(entries);
    expect(report.exitCode).not.toBe(0);
  });

  it('verdict is "fail" when any registered generator violates the contract', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'non-deterministic', gen: createNonDeterministicGenerator() },
    ];
    const report = runGeneratorGate(entries);
    expect(report.verdict).toBe('fail');
  });

  it('summary.failedGenerators counts the violator, passedGenerators counts the rest', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'stub', gen: createStubGenerator() },
      { key: 'non-deterministic', gen: createNonDeterministicGenerator() },
    ];
    const report = runGeneratorGate(entries);
    expect(report.summary.totalGenerators).toBe(2);
    expect(report.summary.passedGenerators).toBe(1);
    expect(report.summary.failedGenerators).toBe(1);
  });

  it('perGeneratorReports surfaces the failing key with a failing verdict', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'non-deterministic', gen: createNonDeterministicGenerator() },
    ];
    const report = runGeneratorGate(entries);
    const failing = report.perGeneratorReports.find(
      (r) => r.key === 'non-deterministic',
    );
    expect(failing).toBeDefined();
    expect(failing?.verdict).toBe('fail');
  });

  it('the failing per-generator report names a violating check (determinism)', () => {
    const entries: GateGeneratorEntry[] = [
      { key: 'non-deterministic', gen: createNonDeterministicGenerator() },
    ];
    const report = runGeneratorGate(entries);
    const failing = report.perGeneratorReports.find(
      (r) => r.key === 'non-deterministic',
    );
    const checkNames = (failing?.report.checks ?? []).map((c) => c.name);
    expect(checkNames).toContain('determinism');
  });
});
