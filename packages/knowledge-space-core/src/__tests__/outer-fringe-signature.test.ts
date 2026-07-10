import { describe, it, expect } from 'vitest';
import { getOuterFringe } from '../index.js';
import type { FringeEntry, KnowledgeStateEntry } from '../index.js';
import type { KnowledgeSpace } from '../types.js';
import { syntheticMathFixture } from '../fixtures.js';

// ---------------------------------------------------------------------------
// Phase 1 — Outer fringe signature (Red)
// ---------------------------------------------------------------------------

function expectType<T>(_value: T) {
  // compile-time type assertion only
}

describe('outer-fringe signature', () => {
  it('exports getOuterFringe as a standalone function', () => {
    expect(typeof getOuterFringe).toBe('function');
  });

  it('returns a FringeEntry array for a minimal state', () => {
    expect(typeof getOuterFringe).toBe('function');
    const state = new Map<string, KnowledgeStateEntry>();
    const fringe = getOuterFringe(state, syntheticMathFixture as KnowledgeSpace);
    expect(Array.isArray(fringe)).toBe(true);
  });

  it('accepts an optional readinessFn seam parameter', () => {
    expect(typeof getOuterFringe).toBe('function');
    const state = new Map<string, KnowledgeStateEntry>();
    const readinessFn = (_nodeId: string) => 0.8;
    const fringe = getOuterFringe(
      state,
      syntheticMathFixture as KnowledgeSpace,
      readinessFn,
    );
    expect(Array.isArray(fringe)).toBe(true);
  });

  it('has the expected parameter and return shape', () => {
    expect(typeof getOuterFringe).toBe('function');
    type Params = Parameters<typeof getOuterFringe>;
    type Ret = ReturnType<typeof getOuterFringe>;

    expectType<Params[0]>(new Map<string, KnowledgeStateEntry>());
    expectType<Params[1]>(syntheticMathFixture);
    // readinessFn is optional
    expectType<Params[2] | undefined>((_nodeId: string) => 0.8);

    const _returnCheck: Ret = [] as FringeEntry[];
    expect(Array.isArray(_returnCheck)).toBe(true);
  });
});
