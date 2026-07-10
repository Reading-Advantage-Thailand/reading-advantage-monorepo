// Phase-1 contract tests — Task 1 (FR1: Generator correctness contract).
//
// TDD Red phase. The `../contract` module does not exist yet; importing from
// it forces a module-resolution failure, which fails every test in this
// file. Once the contract is implemented (Green phase) the imports resolve
// and the shape/type assertions evaluate against the real contract.

import { describe, it, expect } from 'vitest';
import {
  GENERATOR_CORRECTNESS_CONTRACT_VERSION,
  type GeneratorCorrectnessContract,
} from '../contract.js';

describe('GeneratorCorrectnessContract (FR1)', () => {
  it('exports a version constant matching generator-correctness.vN', () => {
    expect(typeof GENERATOR_CORRECTNESS_CONTRACT_VERSION).toBe('string');
    expect(GENERATOR_CORRECTNESS_CONTRACT_VERSION).toMatch(
      /^generator-correctness\.v\d+$/,
    );
  });

  it('declares a problem field on the contract', () => {
    type _HasProblem = GeneratorCorrectnessContract extends { problem: unknown }
      ? true
      : false;
    const _check: _HasProblem = true;
    expect(_check).toBe(true);
  });

  it('declares a correctAnswer field on the contract', () => {
    type _HasAnswer = GeneratorCorrectnessContract extends {
      correctAnswer: unknown;
    }
      ? true
      : false;
    const _check: _HasAnswer = true;
    expect(_check).toBe(true);
  });

  it('declares a distractors array on the contract', () => {
    type _HasDistractors = GeneratorCorrectnessContract extends {
      distractors: readonly unknown[];
    }
      ? true
      : false;
    const _check: _HasDistractors = true;
    expect(_check).toBe(true);
  });

  it('declares optional solutionSteps on the contract', () => {
    type _HasSteps = GeneratorCorrectnessContract extends {
      solutionSteps?: readonly unknown[];
    }
      ? true
      : false;
    const _check: _HasSteps = true;
    expect(_check).toBe(true);
  });

  it('declares optional invariants on the contract', () => {
    type _HasInvariants = GeneratorCorrectnessContract extends {
      invariants?: readonly unknown[];
    }
      ? true
      : false;
    const _check: _HasInvariants = true;
    expect(_check).toBe(true);
  });
});
