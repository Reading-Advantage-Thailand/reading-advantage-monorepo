// Phase 2 (Track 8 kst-lesser-holes_20260521) — Level Projection core contract regression tests.
//
// kst-srs.v2 §11.2 (Level Projection):
//   "Domain-supplied monotonic function from knowledge state → display level.
//   Presentation-only; never feeds KST/SRS computation."
//
// kst-srs.v2 §3.2 (Cross-Phase guard, P1 ↔ P2):
//   "Level Projection must reject `equivalent_to` and `transfers_to` as KST/SRS
//   inputs (presentation-only). One negative test in P2 asserts the projection
//   takes only knowledge-state, not edges."
//
// Phase 1 added the TYPE contract (`knowledgeStateSchema`, `displayLevelSchema`,
// `LevelProjectionFn`) in `../level-projection.ts`. Phase 2 added the concrete
// `projectDisplayLevel(state, levels) → string` function that the domain-supplied
// level projection uses.
//
// These tests now lock the delivered export, boundary behavior, purity, and
// monotonicity contract so future changes cannot regress the Level Projection API.
//
// Test count: 7 tests. Targeted command:
//   npx vitest run packages/knowledge-space-core/src/__tests__/level-projection.test.ts

import { describe, it, expect } from 'vitest';
import {
  type KnowledgeState,
  type DisplayLevel,
} from '../level-projection.js';
// The Level Projection API must export `projectDisplayLevel` from ../level-projection.
import { projectDisplayLevel } from '../level-projection.js';

// ---------------------------------------------------------------------------
// Shared fixture: a 3-level band [0, 0.5, 0.9] chosen so that empty state
// maps to L1, average mastery 0.5 maps to L2, and full mastery maps to L3.
// Levels are sorted by `minMastery` (ascending) per the schema contract.
// ---------------------------------------------------------------------------

const levels: DisplayLevel[] = [
  { id: 'L1', title: 'Level 1', minMastery: 0 },
  { id: 'L2', title: 'Level 2', minMastery: 0.5 },
  { id: 'L3', title: 'Level 3', minMastery: 0.9 },
];

// ---------------------------------------------------------------------------
// 1. projectDisplayLevel export contract
// ---------------------------------------------------------------------------

describe('Level Projection — projectDisplayLevel export contract (kst-srs.v2 §11.2)', () => {
  it('exports a projectDisplayLevel function from ../level-projection', () => {
    expect(typeof projectDisplayLevel).toBe('function');
  });

  it('has arity 2 (state, levels) — does not accept edges as input', () => {
    // The function signature is (state, levels) → string. Presentation-only
    // means it must not consume edges (no `equivalent_to` / `transfers_to`
    // input parameter). The arity guards against accidental widening.
    expect(projectDisplayLevel.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// 2. Boundary behavior
// ---------------------------------------------------------------------------

describe('Level Projection — boundary behavior (kst-srs.v2 §11.2)', () => {
  it('returns the lowest level when state is empty (no skills)', () => {
    const state: KnowledgeState = { skills: [] };
    expect(projectDisplayLevel(state, levels)).toBe('L1');
  });

  it('returns the highest level when all skills are fully mastered', () => {
    const state: KnowledgeState = {
      skills: [
        { nodeId: 'math.im3.skill.alpha', mastery: 1 },
        { nodeId: 'math.im3.skill.beta', mastery: 1 },
      ],
    };
    expect(projectDisplayLevel(state, levels)).toBe('L3');
  });

  it('returns the level whose minMastery ≤ average mastery < next minMastery', () => {
    const state: KnowledgeState = {
      skills: [
        { nodeId: 'math.im3.skill.alpha', mastery: 0.6 },
        { nodeId: 'math.im3.skill.beta', mastery: 0.4 },
      ],
    };
    // avg = 0.5 → exactly at L2 threshold (0.5) → L2
    expect(projectDisplayLevel(state, levels)).toBe('L2');
  });
});

// ---------------------------------------------------------------------------
// 3. Presentation-only purity
// ---------------------------------------------------------------------------

describe('Level Projection — presentation-only purity (kst-srs.v2 §11.2)', () => {
  it('does not mutate the input state', () => {
    const state: KnowledgeState = {
      skills: [{ nodeId: 'math.im3.skill.alpha', mastery: 0.5 }],
    };
    const snapshot = JSON.parse(JSON.stringify(state));
    projectDisplayLevel(state, levels);
    expect(state).toEqual(snapshot);
  });
});

// ---------------------------------------------------------------------------
// 4. Monotonicity property (sorted state vector ⇒ sorted level index)
// ---------------------------------------------------------------------------

describe('Level Projection — monotonicity property (kst-srs.v2 §11.2)', () => {
  it('higher average mastery maps to a level with index ≥ the level for lower mastery', () => {
    const indexOf = (id: string) => levels.findIndex((l) => l.id === id);
    const low: KnowledgeState = {
      skills: [{ nodeId: 'math.im3.skill.alpha', mastery: 0.1 }],
    };
    const mid: KnowledgeState = {
      skills: [{ nodeId: 'math.im3.skill.alpha', mastery: 0.5 }],
    };
    const high: KnowledgeState = {
      skills: [{ nodeId: 'math.im3.skill.alpha', mastery: 0.95 }],
    };
    const lowIdx = indexOf(projectDisplayLevel(low, levels));
    const midIdx = indexOf(projectDisplayLevel(mid, levels));
    const highIdx = indexOf(projectDisplayLevel(high, levels));
    expect(lowIdx).toBeLessThanOrEqual(midIdx);
    expect(midIdx).toBeLessThanOrEqual(highIdx);
  });
});
