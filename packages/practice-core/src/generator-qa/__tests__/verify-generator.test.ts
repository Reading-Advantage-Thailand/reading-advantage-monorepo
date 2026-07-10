// Phase-1 harness API tests — Task 2 (FR6: verifyGenerator utility + report).
//
// TDD Red phase. The `../verify-generator` module does not exist yet; the
// value import on `verifyGenerator` forces a module-resolution failure,
// failing every test in this file. Once the harness is implemented (Green
// phase) the imports resolve and the type/shape/smoke assertions evaluate
// against the real implementation.

import { describe, it, expect, expectTypeOf } from 'vitest';
import {
  verifyGenerator,
  type VerifyGeneratorOptions,
  type VerifyGeneratorReport,
  type VerifyGeneratorCheck,
  type VerifyGeneratorError,
  type VerifyGeneratorSummary,
} from '../verify-generator.js';
import { createStubGenerator } from './fixtures/stubGenerator.js';

describe('verifyGenerator — API surface (FR6)', () => {
  it('exports verifyGenerator as a function', () => {
    expect(typeof verifyGenerator).toBe('function');
  });

  it('exposes VerifyGeneratorOptions with numSeeds and oracle fields', () => {
    expectTypeOf<VerifyGeneratorOptions>().toHaveProperty('numSeeds');
    expectTypeOf<VerifyGeneratorOptions>().toHaveProperty('oracle');
  });

  it('exposes VerifyGeneratorReport with verdict, checks, errors, summary', () => {
    expectTypeOf<VerifyGeneratorReport>().toHaveProperty('verdict');
    expectTypeOf<VerifyGeneratorReport>().toHaveProperty('checks');
    expectTypeOf<VerifyGeneratorReport>().toHaveProperty('errors');
    expectTypeOf<VerifyGeneratorReport>().toHaveProperty('summary');
  });

  it('verdict is the literal union "pass" | "fail"', () => {
    expectTypeOf<VerifyGeneratorReport['verdict']>().toEqualTypeOf<
      'pass' | 'fail'
    >();
  });

  it('checks is an array of VerifyGeneratorCheck entries', () => {
    expectTypeOf<VerifyGeneratorReport['checks']>().toEqualTypeOf<
      VerifyGeneratorCheck[]
    >();
  });

  it('errors is an array of VerifyGeneratorError entries', () => {
    expectTypeOf<VerifyGeneratorReport['errors']>().toEqualTypeOf<
      VerifyGeneratorError[]
    >();
  });

  it('summary is a VerifyGeneratorSummary record', () => {
    expectTypeOf<VerifyGeneratorReport['summary']>().toEqualTypeOf<VerifyGeneratorSummary>();
  });
});

describe('verifyGenerator — runtime smoke test on stub generator (FR6 AC1)', () => {
  it('returns a passing report for a well-formed stub generator with default options', () => {
    const stub = createStubGenerator();
    const report = verifyGenerator(stub, {});
    expect(report.verdict).toBe('pass');
    expect(Array.isArray(report.checks)).toBe(true);
    expect(Array.isArray(report.errors)).toBe(true);
    expect(report.errors).toHaveLength(0);
  });

  it('returns a report whose checks array contains a determinism check', () => {
    const stub = createStubGenerator();
    const report = verifyGenerator(stub, {});
    const names = report.checks.map((c) => c.name);
    expect(names).toContain('determinism');
  });
});
