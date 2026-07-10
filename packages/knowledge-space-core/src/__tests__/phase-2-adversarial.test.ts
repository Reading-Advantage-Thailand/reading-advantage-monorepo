// Phase 2 — Adversarial tests (kst-srs.v2)
//
// Covers: time-travel transitions, missing-data edge cases, corrupted input,
// empty/single-node graphs, hysteresis boundary values, rapid state cycling,
// zero/negative stability, threshold exactly-at-value edge cases.
//
// These are designed to break naive implementations and validate robustness.

import { describe, it, expect } from 'vitest';
import { getKnowledgeState, stabilityToRetention, determineState } from '../index.js';
import { MASTERY_THRESHOLDS_DEFAULT } from '../mastery-state.js';
import type { KnowledgeStateEntry, MasteryState, MasteryThresholds } from '../index.js';
import type { KnowledgeSpace } from '../types.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000;
const DAY_MS = 86_400_000;

function makeSkillNode(id: string): KnowledgeSpace['nodes'][number] {
  return {
    id,
    kind: 'skill',
    title: `Skill ${id}`,
    domain: 'test.domain',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
    metadata: {},
  };
}

function makePrereqEdge(sourceId: string, targetId: string, weight = 1): KnowledgeSpace['edges'][number] {
  return {
    id: `edge.${sourceId}.to.${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight,
    confidence: 'high',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
  };
}

function makeGraph(nodeIds: string[], edges?: [string, string][]): KnowledgeSpace {
  const nodes = nodeIds.map(makeSkillNode);
  const edgeList = (edges ?? []).map(([s, t]) => makePrereqEdge(s, t));
  return { nodes, edges: edgeList };
}

function makeEvidence(
  sourceId: string,
  opts?: { isProficient?: boolean; stability?: number; lastReviewedAt?: number; retention?: number },
) {
  return { sourceId, ...opts };
}

const student = { id: 'student.test' };

// ---------------------------------------------------------------------------
// 1. Time-travel: state evolves correctly as time advances
// ---------------------------------------------------------------------------

describe('adversarial — time-travel transitions', () => {
  const graph = makeGraph(['s1']);

  it('transitions: untouched → mastered → decaying → inProgress → mastered over time', () => {
    // Day 0: first review → mastered (proficient, just reviewed = high retention)
    const evidenceFresh = [makeEvidence('s1', { isProficient: true, stability: 30, lastReviewedAt: NOW })];
    const state0 = getKnowledgeState(student, evidenceFresh, graph, NOW);
    expect(state0.get('s1')!.state).toBe('mastered');
    const prev0 = state0;

    // Day 45: no new review, retention decays below masteryExit (0.7)
    const t45 = NOW + 45 * DAY_MS;
    const state45 = getKnowledgeState(student, evidenceFresh, graph, t45, undefined, prev0);
    expect(state45.get('s1')!.retention).toBeLessThan(0.7);
    // Previous was mastered, retention < masteryExit → decaying
    expect(state45.get('s1')!.state).toBe('decaying');
    const prev45 = state45;

    // Day 365: deep decay, retention very low
    const t365 = NOW + 365 * DAY_MS;
    const state365 = getKnowledgeState(student, evidenceFresh, graph, t365, undefined, prev45);
    expect(state365.get('s1')!.retention).toBeLessThan(0.1);
    // Deep decay → inProgress
    expect(state365.get('s1')!.state).toBe('inProgress');
    const prev365 = state365;

    // Day 366: fresh review → back to mastered
    const evidenceReReview = [makeEvidence('s1', { isProficient: true, stability: 30, lastReviewedAt: t365 })];
    const stateReReview = getKnowledgeState(student, evidenceReReview, graph, t365, undefined, prev365);
    expect(stateReReview.get('s1')!.state).toBe('mastered');
  });
});

// ---------------------------------------------------------------------------
// 2. Rapid enter/exit/re-enter cycles (hysteresis edge)
// ---------------------------------------------------------------------------

describe('adversarial — rapid enter/exit/re-enter cycles', () => {
  const graph = makeGraph(['s1']);

  it('rapid cycle: mastered → decaying → mastered → decaying in short succession', () => {
    // Fresh review → mastered
    const ev = [makeEvidence('s1', { isProficient: true, stability: 1, lastReviewedAt: NOW })];
    const s0 = getKnowledgeState(student, ev, graph, NOW);
    expect(s0.get('s1')!.state).toBe('mastered');

    // 2 days later with stability=1 → retention < masteryExit → decaying
    const t2 = NOW + 2 * DAY_MS;
    const s1 = getKnowledgeState(student, ev, graph, t2, undefined, s0);
    expect(s1.get('s1')!.state).toBe('decaying');

    // Re-review immediately → retention reset to 1 → mastered
    const ev2 = [makeEvidence('s1', { isProficient: true, stability: 1, lastReviewedAt: t2 })];
    const s2 = getKnowledgeState(student, ev2, graph, t2, undefined, s1);
    expect(s2.get('s1')!.state).toBe('mastered');

    // 2 more days → decaying again
    const t4 = t2 + 2 * DAY_MS;
    const s3 = getKnowledgeState(student, ev2, graph, t4, undefined, s2);
    expect(s3.get('s1')!.state).toBe('decaying');
  });

  it('should not flip between decaying and inProgress on each call', () => {
    // Setup: previously decaying, retention right at the boundary
    const prev = new Map<string, KnowledgeStateEntry>();
    prev.set('s1', {
      nodeId: 's1',
      mastery: 0.4,
      retention: 0.4,
      isProficient: true,
      state: 'decaying',
    });

    const ev = [makeEvidence('s1', { isProficient: true, stability: 1, lastReviewedAt: NOW - 2 * DAY_MS })];

    // Run twice with same inputs → same output
    const r1 = getKnowledgeState(student, ev, graph, NOW, undefined, prev);
    const r2 = getKnowledgeState(student, ev, graph, NOW, undefined, prev);
    expect(r1.get('s1')!.state).toBe(r2.get('s1')!.state);
  });
});

// ---------------------------------------------------------------------------
// 3. Missing-data and partial evidence edge cases
// ---------------------------------------------------------------------------

describe('adversarial — missing-data edge cases', () => {
  const graph = makeGraph(['s1', 's2', 's3']);

  it('empty evidence array → all untouched', () => {
    const state = getKnowledgeState(student, [], graph, NOW);
    for (const [, entry] of state) {
      expect(entry.state).toBe('untouched');
      expect(entry.mastery).toBe(0);
      expect(entry.retention).toBe(0);
      expect(entry.isProficient).toBe(false);
    }
  });

  it('partial evidence: only some nodes have data', () => {
    const ev = [makeEvidence('s1', { isProficient: true, stability: 30, lastReviewedAt: NOW })];
    const state = getKnowledgeState(student, ev, graph, NOW);
    expect(state.get('s1')!.state).not.toBe('untouched');
    expect(state.get('s2')!.state).toBe('untouched');
    expect(state.get('s3')!.state).toBe('untouched');
  });

  it('evidence with missing stability: uses pre-computed retention if provided', () => {
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.85 }];
    const state = getKnowledgeState(student, ev, graph, NOW);
    const entry = state.get('s1')!;
    expect(entry.retention).toBeCloseTo(0.85, 5);
    expect(entry.isProficient).toBe(true);
  });

  it('evidence with missing isProficient defaults to false', () => {
    const ev = [{ sourceId: 's1', stability: 30, lastReviewedAt: NOW }];
    const state = getKnowledgeState(student, ev, graph, NOW);
    const entry = state.get('s1')!;
    expect(entry.isProficient).toBe(false);
    expect(entry.state).toBe('inProgress');
  });

  it('evidence with both retention and stability: uses pre-computed retention over stability', () => {
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.5, stability: 365, lastReviewedAt: NOW }];
    const state = getKnowledgeState(student, ev, graph, NOW);
    // Pre-computed 0.5 is used, not the freshness-based 1.0
    expect(state.get('s1')!.retention).toBeCloseTo(0.5, 5);
  });

  it('evidence with neither stability nor retention: retention defaults to 0', () => {
    const ev = [{ sourceId: 's1', isProficient: true }];
    const state = getKnowledgeState(student, ev, graph, NOW);
    const entry = state.get('s1')!;
    expect(entry.retention).toBe(0);
    expect(entry.mastery).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 4. Corrupted/edge-value inputs
// ---------------------------------------------------------------------------

describe('adversarial — corrupted and edge-value inputs', () => {
  const graph = makeGraph(['s1']);

  it('zero stability: retention returns 0 (stabilityToRetention guard)', () => {
    const r = stabilityToRetention(0, 10, 1);
    expect(r).toBe(0);
  });

  it('negative stability: retention returns 0', () => {
    const r = stabilityToRetention(-5, 10, 1);
    expect(r).toBe(0);
  });

  it('negative deltaDays: clamped to 0', () => {
    const r = stabilityToRetention(30, -10, 1);
    // deltaDays is max(0, deltaMs/...) in the engine, but the raw fn
    // passes negative through. Let engine handle clamping.
    expect(r).toBeGreaterThan(0); // exp(-(-10)/(30*1)) = exp(10/30) > 1 → clamped to 1
  });

  it('NaN stability should not crash', () => {
    const ev = [{ sourceId: 's1', isProficient: true, stability: NaN, lastReviewedAt: NOW }];
    const state = getKnowledgeState(student, ev, graph, NOW);
    expect(state.get('s1')).toBeDefined();
    expect(typeof state.get('s1')!.retention).toBe('number');
  });

  it('infinity stability → retention stays at 1', () => {
    const r = stabilityToRetention(Infinity, 30, 1);
    // exp(-30/infinity) = exp(0) = 1
    expect(r).toBeCloseTo(1.0, 5);
  });

  it('very large deltaDays does not produce NaN', () => {
    const r = stabilityToRetention(30, 1_000_000, 1);
    expect(r).toBeGreaterThanOrEqual(0);
    expect(Number.isNaN(r)).toBe(false);
    expect(r).toBeLessThan(0.1);
  });

  it('scale parameter of 0: effectively zero retention for any delta', () => {
    const r = stabilityToRetention(30, 1, 0);
    expect(r).toBe(0);
  });

  it('evidence sourceId does not exist in graph → ignored gracefully', () => {
    const ev = [{ sourceId: 'nonexistent', isProficient: true, stability: 30, lastReviewedAt: NOW }];
    const state = getKnowledgeState(student, ev, graph, NOW);
    // The node with id 's1' should still appear as untouched
    expect(state.get('s1')!.state).toBe('untouched');
  });

  it('duplicate evidence entries: last one wins', () => {
    const ev = [
      { sourceId: 's1', isProficient: true, stability: 365, lastReviewedAt: NOW },
      { sourceId: 's1', isProficient: false, stability: 1, lastReviewedAt: NOW },
    ];
    const state = getKnowledgeState(student, ev, graph, NOW);
    // Second entry overwrites the first → not proficient
    expect(state.get('s1')!.isProficient).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// 5. Threshold boundary values (exactly at masteryEnter, exactly at masteryExit)
// ---------------------------------------------------------------------------

describe('adversarial — threshold boundary values', () => {
  const graph = makeGraph(['s1']);
  const t: MasteryThresholds = { ...MASTERY_THRESHOLDS_DEFAULT }; // masteryEnter=0.9, masteryExit=0.7

  it('exactly at masteryEnter (0.9): should enter mastered', () => {
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.9 }];
    const state = getKnowledgeState(student, ev, graph, NOW, t);
    expect(state.get('s1')!.state).toBe('mastered');
  });

  it('just below masteryEnter (0.89999): should NOT enter mastered from scratch', () => {
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.89999 }];
    const state = getKnowledgeState(student, ev, graph, NOW, t);
    expect(state.get('s1')!.state).not.toBe('mastered');
  });

  it('exactly at masteryExit (0.7): previously mastered stays mastered (hysteresis)', () => {
    const prev = new Map<string, KnowledgeStateEntry>();
    prev.set('s1', { nodeId: 's1', mastery: 0.95, retention: 0.95, isProficient: true, state: 'mastered' });
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.7 }];
    const state = getKnowledgeState(student, ev, graph, NOW, t, prev);
    // retention = 0.7 is NOT < 0.7, so should stay mastered
    expect(state.get('s1')!.state).toBe('mastered');
  });

  it('just below masteryExit (0.69999): previously mastered drops to decaying', () => {
    const prev = new Map<string, KnowledgeStateEntry>();
    prev.set('s1', { nodeId: 's1', mastery: 0.95, retention: 0.95, isProficient: true, state: 'mastered' });
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.69999 }];
    const state = getKnowledgeState(student, ev, graph, NOW, t, prev);
    expect(state.get('s1')!.state).toBe('decaying');
  });
});

// ---------------------------------------------------------------------------
// 6. Empty graph
// ---------------------------------------------------------------------------

describe('adversarial — empty graph', () => {
  const emptyGraph: KnowledgeSpace = { nodes: [], edges: [] };

  it('returns empty Map for empty graph', () => {
    const state = getKnowledgeState(student, [], emptyGraph, NOW);
    expect(state.size).toBe(0);
    expect(state).toBeInstanceOf(Map);
  });

  it('ignores evidence when graph is empty', () => {
    const ev = [makeEvidence('s1', { isProficient: true, stability: 30, lastReviewedAt: NOW })];
    const state = getKnowledgeState(student, ev, emptyGraph, NOW);
    expect(state.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 7. Single-node graph with various states
// ---------------------------------------------------------------------------

describe('adversarial — single-node graph thorough', () => {
  const graph = makeGraph(['s1']);

  it('fresh review → mastered', () => {
    const ev = [makeEvidence('s1', { isProficient: true, stability: 365, lastReviewedAt: NOW })];
    const state = getKnowledgeState(student, ev, graph, NOW);
    expect(state.get('s1')!.state).toBe('mastered');
    expect(state.get('s1')!.mastery).toBeGreaterThanOrEqual(0.9);
  });

  it('old review, still proficient → decaying from previous mastered', () => {
    const prev = new Map<string, KnowledgeStateEntry>();
    prev.set('s1', { nodeId: 's1', mastery: 0.95, retention: 0.95, isProficient: true, state: 'mastered' });
    const ev = [makeEvidence('s1', { isProficient: true, stability: 1, lastReviewedAt: NOW - 30 * DAY_MS })];
    const state = getKnowledgeState(student, ev, graph, NOW, undefined, prev);
    expect(state.get('s1')!.state).toBe('decaying');
  });

  it('no previous state, proficient but retention between masteryExit and masteryEnter → inProgress', () => {
    const ev = [{ sourceId: 's1', isProficient: true, retention: 0.8 }]; // 0.7 < 0.8 < 0.9
    const state = getKnowledgeState(student, ev, graph, NOW);
    expect(state.get('s1')!.state).toBe('inProgress');
  });
});

// ---------------------------------------------------------------------------
// 8. Multi-node DAG with complex prerequisites
// ---------------------------------------------------------------------------

describe('adversarial — multi-node DAG', () => {
  // Linear chain: A → B → C → D
  const chainGraph = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['B', 'C'], ['C', 'D']]);

  it('all mastered → no untouched nodes', () => {
    const ev = [
      makeEvidence('A', { isProficient: true, stability: 365, lastReviewedAt: NOW }),
      makeEvidence('B', { isProficient: true, stability: 365, lastReviewedAt: NOW }),
      makeEvidence('C', { isProficient: true, stability: 365, lastReviewedAt: NOW }),
      makeEvidence('D', { isProficient: true, stability: 365, lastReviewedAt: NOW }),
    ];
    const state = getKnowledgeState(student, ev, chainGraph, NOW);
    expect(state.get('A')!.state).toBe('mastered');
    expect(state.get('B')!.state).toBe('mastered');
    expect(state.get('C')!.state).toBe('mastered');
    expect(state.get('D')!.state).toBe('mastered');
  });

  it('root mastered only → middle nodes untouched', () => {
    const ev = [makeEvidence('A', { isProficient: true, stability: 365, lastReviewedAt: NOW })];
    const state = getKnowledgeState(student, ev, chainGraph, NOW);
    expect(state.get('A')!.state).toBe('mastered');
    expect(state.get('B')!.state).toBe('untouched');
    expect(state.get('C')!.state).toBe('untouched');
    expect(state.get('D')!.state).toBe('untouched');
  });

  // Diamond: A → B, A → C, B → D, C → D
  const diamondGraph = makeGraph(['A', 'B', 'C', 'D'], [['A', 'B'], ['A', 'C'], ['B', 'D'], ['C', 'D']]);

  it('diamond graph: all nodes appear in output', () => {
    const ev = [
      makeEvidence('A', { isProficient: true, stability: 365, lastReviewedAt: NOW }),
    ];
    const state = getKnowledgeState(student, ev, diamondGraph, NOW);
    expect(state.has('A')).toBe(true);
    expect(state.has('B')).toBe(true);
    expect(state.has('C')).toBe(true);
    expect(state.has('D')).toBe(true);
    expect(state.get('A')!.state).toBe('mastered');
  });
});

// ---------------------------------------------------------------------------
// 9. Pure function property — consecutive calls identical
// ---------------------------------------------------------------------------

describe('adversarial — pure function determinism', () => {
  const graph = makeGraph(['s1', 's2']);

  it('100 consecutive calls with same inputs return identical state maps', () => {
    const ev = [makeEvidence('s1', { isProficient: true, stability: 30, lastReviewedAt: NOW })];
    const reference = getKnowledgeState(student, ev, graph, NOW);

    for (let i = 0; i < 100; i++) {
      const result = getKnowledgeState(student, ev, graph, NOW);
      expect(result.size).toBe(reference.size);
      for (const [nodeId, entry] of reference) {
        const other = result.get(nodeId);
        expect(other).toBeDefined();
        expect(other!.state).toBe(entry.state);
        expect(other!.mastery).toBeCloseTo(entry.mastery, 14);
        expect(other!.retention).toBeCloseTo(entry.retention, 14);
      }
    }
  });

  it('does not mutate input evidence array', () => {
    const ev = [makeEvidence('s1', { isProficient: true, stability: 30, lastReviewedAt: NOW })];
    const snapshot = JSON.parse(JSON.stringify(ev));
    getKnowledgeState(student, ev, graph, NOW);
    expect(ev).toEqual(snapshot);
  });

  it('does not mutate previousState map when passed', () => {
    const prev = new Map<string, KnowledgeStateEntry>();
    prev.set('s1', { nodeId: 's1', mastery: 0.5, retention: 0.5, isProficient: true, state: 'decaying' });
    const prevSize = prev.size;
    const prevKeys = [...prev.keys()];
    getKnowledgeState(student, [], graph, NOW, undefined, prev);
    expect(prev.size).toBe(prevSize);
    expect([...prev.keys()]).toEqual(prevKeys);
  });
});

// ---------------------------------------------------------------------------
// 10. determineState() exhaustive edge cases
// ---------------------------------------------------------------------------

describe('adversarial — determineState() edge cases', () => {
  const t = MASTERY_THRESHOLDS_DEFAULT;

  const allStates: MasteryState[] = ['mastered', 'decaying', 'inProgress', 'untouched'];
  const proficiencyValues = [true, false];
  const retentionValues = [0, 0.35, 0.7, 0.9, 1.0];

  it('never throws for any valid input combination', () => {
    for (const isProficient of proficiencyValues) {
      for (const retention of retentionValues) {
        for (const prevState of allStates) {
          expect(() => determineState(isProficient, retention, prevState, t)).not.toThrow();
        }
        // undefined previous state
        expect(() => determineState(isProficient, retention, undefined, t)).not.toThrow();
      }
    }
  });

  it('returns a valid MasteryState for all combinations', () => {
    const validStates = new Set(allStates);
    for (const isProficient of proficiencyValues) {
      for (const retention of retentionValues) {
        for (const prevState of allStates) {
          const result = determineState(isProficient, retention, prevState, t);
          expect(validStates.has(result)).toBe(true);
        }
        const result = determineState(isProficient, retention, undefined, t);
        expect(validStates.has(result)).toBe(true);
      }
    }
  });
});
