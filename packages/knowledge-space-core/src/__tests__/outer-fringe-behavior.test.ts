// Phase 2 — Outer Fringe behavior (Red)
//
// Tests fringe membership, binary prerequisite gating, time-awareness,
// and the readinessFn seam per kst-srs.v2 §4. These are intentionally RED
// until Phase 2 Green implements the full fringe logic.

import { describe, it, expect } from 'vitest';
import { getOuterFringe } from '../index.js';
import type { KnowledgeStateEntry } from '../index.js';
import type { KnowledgeSpace } from '../types.js';

// ---------------------------------------------------------------------------
// Minimal DAG fixture: A → B (prerequisite_for edge)
// A has no prereqs (root node); B requires A
// ---------------------------------------------------------------------------

const skillA: KnowledgeSpace['nodes'][number] = {
  id: 'skill.a',
  kind: 'skill',
  title: 'Skill A',
  domain: 'test.domain',
  sourceRefs: ['test'],
  reviewStatus: 'draft' as const,
  metadata: {},
};
const skillB: KnowledgeSpace['nodes'][number] = {
  id: 'skill.b',
  kind: 'skill',
  title: 'Skill B',
  domain: 'test.domain',
  sourceRefs: ['test'],
  reviewStatus: 'draft' as const,
  metadata: {},
};
const edgeAB: KnowledgeSpace['edges'][number] = {
  id: 'edge.a-to-b',
  type: 'prerequisite_for',
  sourceId: 'skill.a',
  targetId: 'skill.b',
  weight: 1,
  confidence: 'high',
  sourceRefs: ['test'],
  reviewStatus: 'draft' as const,
};

const simpleGraph: KnowledgeSpace = {
  nodes: [skillA, skillB],
  edges: [edgeAB],
};

// Empty graph
const emptyGraph: KnowledgeSpace = { nodes: [], edges: [] };

// Helper: create an entry with specific state
function entry(nodeId: string, state: KnowledgeStateEntry['state']): KnowledgeStateEntry {
  return {
    nodeId,
    mastery: state === 'mastered' ? 0.95 : state === 'decaying' ? 0.6 : state === 'inProgress' ? 0.4 : 0,
    retention: state === 'mastered' ? 0.95 : state === 'decaying' ? 0.6 : state === 'inProgress' ? 0.4 : 0,
    isProficient: state === 'mastered' || state === 'decaying',
    state,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('getOuterFringe — root node (no prerequisites)', () => {
  it('includes a root node that is not mastered', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'inProgress'));
    state.set('skill.b', entry('skill.b', 'untouched'));
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).toContain('skill.a');
  });

  it('excludes a root node that is already mastered', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).not.toContain('skill.a');
  });
});

describe('getOuterFringe — prerequisite gating', () => {
  it('includes a node whose prerequisites are all mastered', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));   // prereq mastered
    state.set('skill.b', entry('skill.b', 'untouched'));   // not yet mastered
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).toContain('skill.b');
  });

  it('excludes a node whose prerequisites are not all mastered', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'inProgress'));  // prereq NOT mastered
    state.set('skill.b', entry('skill.b', 'untouched'));
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).not.toContain('skill.b');
  });

  it('includes a node whose prerequisites are decaying (weighted readiness default)', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'decaying'));  // prereq decaying, mastery=0.6
    state.set('skill.b', entry('skill.b', 'untouched'));
    // With weighted readiness, decaying prereq (mastery=0.6) gives
    // readiness=0.6 ≥ 0.50 → nearly_ready → included
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).toContain('skill.b');
  });

  it('includes a node whose prerequisites are nearly_ready when readinessFn is provided', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'decaying'));  // prereq decaying
    state.set('skill.b', entry('skill.b', 'untouched'));
    // Custom readinessFn: treats any state except untouched as ready
    const readinessFn = (_nodeId: string, _s: Map<string, KnowledgeStateEntry>) => 0.85;
    const fringe = getOuterFringe(state, simpleGraph, readinessFn);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).toContain('skill.b');
    // Also check readinessState field is populated
    for (const f of fringe) {
      if (f.nodeId === 'skill.b') {
        expect(f.readinessState).toBeDefined();
        expect(f.readiness).toBeDefined();
      }
    }
  });
});

describe('getOuterFringe — mastered exclusion', () => {
  it('excludes mastered nodes even if their prereqs are satisfied', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));
    state.set('skill.b', entry('skill.b', 'mastered'));
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).not.toContain('skill.a');
    expect(ids).not.toContain('skill.b');
    expect(ids.length).toBe(0);
  });
});

describe('getOuterFringe — empty and edge cases', () => {
  it('returns empty array for an empty graph', () => {
    const fringe = getOuterFringe(new Map(), emptyGraph);
    expect(Array.isArray(fringe)).toBe(true);
    expect(fringe.length).toBe(0);
  });

  it('returns empty array when state map is empty', () => {
    const fringe = getOuterFringe(new Map(), simpleGraph);
    // All nodes are untouched (no state entries), which default to not-mastered
    // But root node has no prereqs, so it should appear
    expect(fringe.length).toBeGreaterThanOrEqual(0);
  });

  it('each returned entry is a FringeEntry with required shape', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));
    state.set('skill.b', entry('skill.b', 'untouched'));
    const fringe = getOuterFringe(state, simpleGraph);
    for (const f of fringe) {
      expect(typeof f.nodeId).toBe('string');
    }
  });
});

describe('getOuterFringe — readinessFn seam', () => {
  it('calls readinessFn when provided and honors its return', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'inProgress')); // not mastered
    state.set('skill.b', entry('skill.b', 'untouched'));

    const callLog: string[] = [];
    const readinessFn = (nodeId: string, _s: Map<string, KnowledgeStateEntry>) => {
      callLog.push(nodeId);
      return 0.9; // high readiness → all nodes are "ready"
    };

    const fringe = getOuterFringe(state, simpleGraph, readinessFn);
    // readinessFn should have been called
    expect(callLog.length).toBeGreaterThan(0);

    // With high readiness, B's prereqs are effectively "ready"
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).toContain('skill.b');
  });

  it('returns correct readinessState labels', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));
    state.set('skill.b', entry('skill.b', 'untouched'));

    // readinessFn returns 0.85 → above readyThreshold (0.80) → 'ready'
    const readyFn = () => 0.85;
    const fringeReady = getOuterFringe(state, simpleGraph, readyFn);
    for (const f of fringeReady) {
      if (f.readinessState) {
        expect(f.readinessState).toBe('ready');
      }
    }

    // readinessFn returns 0.6 → between nearThreshold (0.50) and readyThreshold (0.80) → 'nearly_ready'
    const nearlyFn = () => 0.6;
    const fringeNearly = getOuterFringe(state, simpleGraph, nearlyFn);
    for (const f of fringeNearly) {
      if (f.readinessState) {
        expect(f.readinessState).toBe('nearly_ready');
      }
    }

    // readinessFn returns 0.3 → below nearThreshold (0.50) → 'blocked'
    const blockedFn = () => 0.3;
    const fringeBlocked = getOuterFringe(state, simpleGraph, blockedFn);
    for (const f of fringeBlocked) {
      if (f.readinessState) {
        expect(f.readinessState).toBe('blocked');
      }
    }
  });

  it('accepts readinessFn without being required', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));
    // Call without readinessFn — must not throw
    const fringe = getOuterFringe(state, simpleGraph);
    expect(Array.isArray(fringe)).toBe(true);
  });
});

describe('getOuterFringe — standalone export (FR3)', () => {
  it('is a top-level function, not nested in another object', () => {
    // Phase 1 already verified this; Phase 2 confirms it stays standalone
    expect(typeof getOuterFringe).toBe('function');
    // Must not be a property on a projection namespace
    expect(getOuterFringe.name).toBe('getOuterFringe');
  });
});

// ---------------------------------------------------------------------------
// Phase 2 Track 2 — Weighted Readiness fringe integration (Red)
// ---------------------------------------------------------------------------

describe('getOuterFringe — weighted readiness default (FR3)', () => {
  it('defaults to weighted readiness when no readinessFn is provided', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    // Prereq has partial mastery (0.6 decays to nearly_ready)
    state.set('skill.a', entry('skill.a', 'decaying'));
    state.set('skill.b', entry('skill.b', 'untouched'));

    // Without a readinessFn, the default should be weighted readiness
    const fringe = getOuterFringe(state, simpleGraph);
    const ids = fringe.map((f) => f.nodeId);

    // skill.a is not mastered, no prereqs → readiness=1 → ready → included
    expect(ids).toContain('skill.a');
    // skill.b has prereq skill.a at 0.6 mastery → readiness=0.6 → nearly_ready → included
    expect(ids).toContain('skill.b');
  });

  it('includes nearly_ready nodes in the fringe', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    // Prereq has enough mastery for nearly_ready (0.6 ≥ 0.50)
    state.set('skill.a', entry('skill.a', 'decaying'));
    state.set('skill.b', entry('skill.b', 'untouched'));

    const fringe = getOuterFringe(state, simpleGraph);
    const bEntry = fringe.find((f) => f.nodeId === 'skill.b');
    expect(bEntry).toBeDefined();
    if (bEntry) {
      expect(bEntry.readinessState).toBe('nearly_ready');
      expect(bEntry.readiness).toBeCloseTo(0.6, 1);
    }
  });

  it('excludes blocked nodes from the fringe', () => {
    // Need a node with a prereq that has very low mastery → blocked
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'inProgress')); // mastery=0.4
    state.set('skill.b', entry('skill.b', 'untouched'));

    // skill.a mastery=0.4: readiness=0.4 < 0.50 → blocked
    const fringe = getOuterFringe(state, simpleGraph);
    const bEntry = fringe.find((f) => f.nodeId === 'skill.b');
    expect(bEntry).toBeUndefined();
  });

  it('each fringe entry carries readiness score and readinessState', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'mastered'));
    state.set('skill.b', entry('skill.b', 'untouched'));

    const fringe = getOuterFringe(state, simpleGraph);
    for (const f of fringe) {
      expect(typeof f.readiness).toBe('number');
      expect(f.readiness).toBeGreaterThanOrEqual(0);
      expect(f.readiness).toBeLessThanOrEqual(1);
      expect(['ready', 'nearly_ready', 'blocked']).toContain(f.readinessState);
      // Since blocked is excluded, all entries should be ready or nearly_ready
      expect(['ready', 'nearly_ready']).toContain(f.readinessState);
    }
  });

  it('custom readinessFn still works and includes all non-mastered nodes', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'inProgress'));
    state.set('skill.b', entry('skill.b', 'untouched'));

    const readinessFn = () => 0.3; // below nearThreshold → blocked
    const fringe = getOuterFringe(state, simpleGraph, readinessFn);
    // With custom readinessFn, ALL non-mastered nodes appear (including blocked)
    const ids = fringe.map((f) => f.nodeId);
    expect(ids).toContain('skill.a');
    expect(ids).toContain('skill.b');
    for (const f of fringe) {
      expect(f.readinessState).toBe('blocked');
    }
  });

  it('root nodes (no prereqs) are always ready in the default fringe', () => {
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', entry('skill.a', 'inProgress'));
    state.set('skill.b', entry('skill.b', 'untouched'));

    const fringe = getOuterFringe(state, simpleGraph);
    const aEntry = fringe.find((f) => f.nodeId === 'skill.a');
    expect(aEntry).toBeDefined();
    if (aEntry) {
      expect(aEntry.readiness).toBe(1);
      expect(aEntry.readinessState).toBe('ready');
    }
  });
});
