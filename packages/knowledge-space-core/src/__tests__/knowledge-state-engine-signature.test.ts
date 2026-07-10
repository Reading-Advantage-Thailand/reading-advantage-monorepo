import { describe, it, expect } from 'vitest';
import { getKnowledgeState } from '../index.js';
import type { KnowledgeStateEntry } from '../index.js';
import type { KnowledgeState } from '../level-projection.js';
import type { KnowledgeSpace } from '../types.js';
import { syntheticMathFixture } from '../fixtures.js';

// ---------------------------------------------------------------------------
// Phase 1 — Knowledge state engine signature (Red)
// ---------------------------------------------------------------------------

function expectType<T>(_value: T) {
  // compile-time type assertion only
}

describe('knowledge-state-engine signature', () => {
  it('exports getKnowledgeState as a function', () => {
    expect(typeof getKnowledgeState).toBe('function');
  });

  it('returns a Map when called with a minimal graph and empty evidence', () => {
    expect(typeof getKnowledgeState).toBe('function');
    const state = getKnowledgeState(
      { id: 'student.test' },
      [],
      syntheticMathFixture as KnowledgeSpace,
      0,
    );
    expect(state).toBeInstanceOf(Map);
  });

  it('has the expected parameter shape', () => {
    expect(typeof getKnowledgeState).toBe('function');
    type Params = Parameters<typeof getKnowledgeState>;
    // student-like first argument
    expectType<Params[0]>({ id: 'student.test' });
    // evidence-like second argument
    expectType<Params[1]>([]);
    // graph-like third argument
    expectType<Params[2]>(syntheticMathFixture);
    // now: number
    expectType<Params[3]>(0);
    // thresholds?: Partial<MasteryThresholds>
    expectType<Params[4] | undefined>({ masteryEnter: 0.95 });
  });

  it('returns Map<NodeId, KnowledgeStateEntry>', () => {
    expect(typeof getKnowledgeState).toBe('function');
    type Ret = ReturnType<typeof getKnowledgeState>;
    const _check: Ret = new Map<string, KnowledgeStateEntry>();
    expect(_check).toBeInstanceOf(Map);
  });

  it('keeps KnowledgeStateEntry distinct from the projection KnowledgeState', () => {
    expect(typeof getKnowledgeState).toBe('function');
    // compile-time guard: the v2 per-node entry must NOT be assignable to the
    // flat-list KnowledgeState used by projectDisplayLevel.
    type _EntryNotAssignableToFlatList = KnowledgeStateEntry extends KnowledgeState
      ? never
      : true;
    expectType<_EntryNotAssignableToFlatList>(true);
  });
});
