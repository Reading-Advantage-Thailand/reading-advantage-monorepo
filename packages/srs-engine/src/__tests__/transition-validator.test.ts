import { describe, it, expect } from 'vitest';
import { validateSrsTransition } from '../srs/transition-validator.js';
import type { SrsCardState } from '../srs/contract.js';

type PickState = Pick<SrsCardState, 'stability' | 'difficulty' | 'state' | 'reps' | 'lapses'>;

/**
 * Create a partial SRS card state with optional overrides.
 * @param {Partial<PickState>} overrides - Partial state fields to override
 * @returns {PickState} - Partial card state with sensible defaults
 */
function makeState(overrides: Partial<PickState> = {}): PickState {
  return {
    stability: 0,
    difficulty: 0,
    state: 'new',
    reps: 0,
    lapses: 0,
    ...overrides,
  };
}

describe('validateSrsTransition', () => {
  it('accepts valid new → learning transition on first review', () => {
    const before = makeState({ state: 'new', reps: 0, lapses: 0 });
    const after = makeState({ state: 'learning', reps: 1, lapses: 0, stability: 0.5 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid new → review transition (short-term preview off)', () => {
    const before = makeState({ state: 'new', reps: 0, lapses: 0 });
    const after = makeState({ state: 'review', reps: 1, lapses: 0, stability: 2.3 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid learning → review transition', () => {
    const before = makeState({ state: 'learning', reps: 1, lapses: 0 });
    const after = makeState({ state: 'review', reps: 2, lapses: 0, stability: 2.5 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid learning → learning transition (Again in learning)', () => {
    const before = makeState({ state: 'learning', reps: 1, lapses: 0, stability: 0.2 });
    const after = makeState({ state: 'learning', reps: 2, lapses: 0, stability: 0.1 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid review → review transition (normal success)', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 1, stability: 10 });
    const after = makeState({ state: 'review', reps: 6, lapses: 1, stability: 15 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid review → learning transition (Again with short-term preview)', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 0, stability: 10 });
    const after = makeState({ state: 'learning', reps: 6, lapses: 0, stability: 0.5 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid review → review transition with stability decrease (Again, lapses increase)', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 0, stability: 10 });
    const after = makeState({ state: 'review', reps: 6, lapses: 1, stability: 0.5 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('accepts valid relearning → review transition (recovered)', () => {
    const before = makeState({ state: 'relearning', reps: 6, lapses: 2, stability: 1 });
    const after = makeState({ state: 'review', reps: 7, lapses: 2, stability: 3 });
    expect(() => validateSrsTransition(before, after)).not.toThrow();
  });

  it('rejects transition where reps does not increase', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 0 });
    const after = makeState({ state: 'review', reps: 5, lapses: 0, stability: 12 });
    expect(() => validateSrsTransition(before, after)).toThrow('reps must increase by exactly 1');
  });

  it('rejects transition where reps increases by more than 1', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 0 });
    const after = makeState({ state: 'review', reps: 7, lapses: 0, stability: 12 });
    expect(() => validateSrsTransition(before, after)).toThrow('reps must increase by exactly 1');
  });

  it('rejects transition where lapses decrease', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 2 });
    const after = makeState({ state: 'review', reps: 6, lapses: 1, stability: 12 });
    expect(() => validateSrsTransition(before, after)).toThrow('lapses cannot decrease');
  });

  it('rejects invalid review → new transition', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 0 });
    const after = makeState({ state: 'new', reps: 6, lapses: 0, stability: 0 });
    expect(() => validateSrsTransition(before, after)).toThrow('invalid state transition');
  });

  it('rejects invalid learning → new transition', () => {
    const before = makeState({ state: 'learning', reps: 1, lapses: 0 });
    const after = makeState({ state: 'new', reps: 2, lapses: 0, stability: 5 });
    expect(() => validateSrsTransition(before, after)).toThrow('invalid state transition');
  });

  it('rejects transition from identical before and after', () => {
    const before = makeState({ state: 'review', reps: 5, lapses: 1, stability: 10 });
    const after = makeState({ state: 'review', reps: 5, lapses: 1, stability: 10 });
    expect(() => validateSrsTransition(before, after)).toThrow('reps must increase by exactly 1');
  });
});
