// Phase 2 — Knowledge State Engine hysteresis (Red)
//
// Tests the hysteresis enter/exit algorithm, retention decay, and stabilityToRetention
// per kst-srs.v2 §3.2/§3.3. These are intentionally RED until Phase 2 Green implements
// the full hysteresis logic (Phase 1 stub returns empty Map).

import { describe, it, expect } from 'vitest';
import { getKnowledgeState } from '../index.js';
import type { KnowledgeStateEntry } from '../index.js';
import type { KnowledgeSpace } from '../types.js';

// ---------------------------------------------------------------------------
// Minimal DAG fixture: A → B (prerequisite_for edge)
// A has no prereqs; B has prerequisite A
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

// Single-node graph (no edges, no prereqs)
const singleNodeGraph: KnowledgeSpace = {
  nodes: [
    {
      id: 'skill.solo',
      kind: 'skill',
      title: 'Solo Skill',
      domain: 'test.domain',
      sourceRefs: ['test'],
      reviewStatus: 'draft' as const,
      metadata: {},
    },
  ],
  edges: [],
};

const emptyGraph: KnowledgeSpace = { nodes: [], edges: [] };

// Student reference
const student = { id: 'student.test' };

// Reference timestamp
const NOW = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// Helper: create a mastered KnowledgeStateEntry for a node
// ---------------------------------------------------------------------------
function masteredEntry(nodeId: string): KnowledgeStateEntry {
  return {
    nodeId,
    mastery: 0.95,
    retention: 0.95,
    isProficient: true,
    state: 'mastered',
    lastUpdated: NOW - 86_400_000,
  };
}

// ---------------------------------------------------------------------------
// Helper: create a decaying KnowledgeStateEntry for a node
// ---------------------------------------------------------------------------
function decayingEntry(nodeId: string): KnowledgeStateEntry {
  return {
    nodeId,
    mastery: 0.6,
    retention: 0.6,
    isProficient: true,
    state: 'decaying',
    lastUpdated: NOW - 86_400_000,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('stabilityToRetention — exported decay function', () => {
  it('is exported from the package index', async () => {
    // stabilityToRetention is needed by the bridge (Phase 3) and the engine;
    // it is a pure, exported function.
    const mod = await import('../knowledge-state-engine.js');
    expect(typeof mod.stabilityToRetention).toBe('function');
  });

  it('returns 1.0 when deltaT is 0 (just reviewed)', async () => {
    const { stabilityToRetention } = await import('../knowledge-state-engine.js');
    expect(stabilityToRetention).toBeDefined();
    if (typeof stabilityToRetention === 'function') {
      // retention = exp(-0 / (stability * scale)) = exp(0) = 1
      expect(stabilityToRetention(7, 0, 1)).toBeCloseTo(1.0, 5);
    }
  });

  it('decays toward 0 as deltaT grows', async () => {
    const { stabilityToRetention } = await import('../knowledge-state-engine.js');
    expect(stabilityToRetention).toBeDefined();
    if (typeof stabilityToRetention === 'function') {
      // With stability=7, after 30 days, retention should be < 1 but > 0
      const r30 = stabilityToRetention(7, 30, 1);
      expect(r30).toBeGreaterThan(0);
      expect(r30).toBeLessThan(1);
      // After 365 days, should be very low
      const r365 = stabilityToRetention(7, 365, 1);
      expect(r365).toBeLessThan(r30);
      expect(r365).toBeGreaterThan(0);
    }
  });

  it('uses the scale parameter to control decay speed', async () => {
    const { stabilityToRetention } = await import('../knowledge-state-engine.js');
    expect(stabilityToRetention).toBeDefined();
    if (typeof stabilityToRetention === 'function') {
      // At default scale, smaller stability → faster decay
      const rHigh = stabilityToRetention(30, 30, 1);
      const rLow = stabilityToRetention(3, 30, 1);
      expect(rHigh).toBeGreaterThan(rLow);
    }
  });
});

describe('getKnowledgeState — hysteresis enter (kst-srs.v2 §3.3)', () => {
  it('enters mastered when isProficient AND retention >= masteryEnter', () => {
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW,
      },
    ];
    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
    );
    expect(state.get('skill.solo')).toBeDefined();
    expect(state.get('skill.solo')!.state).toBe('mastered');
  });

  it('enters mastered from inProgress with proficiency + high retention', () => {
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW - 86_400_000, // 1 day ago → high retention
      },
    ];
    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
    );
    expect(state.get('skill.solo')!.isProficient).toBe(true);
    // Retention should still be high enough for mastery threshold
    expect(state.get('skill.solo')!.state).toBe('mastered');
  });

  it('stays inProgress when evidence exists but not proficient', () => {
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: false,
        stability: 30,
        lastReviewedAt: NOW,
      },
    ];
    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
    );
    expect(state.get('skill.solo')!.state).toBe('inProgress');
  });
});

describe('getKnowledgeState — hysteresis exit (kst-srs.v2 §3.3)', () => {
  it('drops previously-mastered node to decaying when retention < masteryExit', () => {
    const previousState = new Map<string, KnowledgeStateEntry>();
    previousState.set('skill.solo', masteredEntry('skill.solo'));

    // Evidence shows proficiency but long time since review → low retention
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 1, // very low stability → fast decay
        lastReviewedAt: NOW - 30 * 86_400_000, // 30 days ago
      },
    ];

    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
      undefined,
      previousState,
    );
    expect(state.get('skill.solo')!.state).toBe('decaying');
  });

  it('keeps mastered when retention is still above masteryExit', () => {
    const previousState = new Map<string, KnowledgeStateEntry>();
    previousState.set('skill.solo', masteredEntry('skill.solo'));

    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 365, // high stability → very slow decay
        lastReviewedAt: NOW - 86_400_000, // 1 day ago
      },
    ];

    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
      undefined,
      previousState,
    );
    expect(state.get('skill.solo')!.state).toBe('mastered');
  });
});

describe('getKnowledgeState — hysteresis re-enter on recovery (kst-srs.v2 §3.3)', () => {
  it('re-enters mastered from decaying when retention ≥ masteryEnter and isProficient', () => {
    const previousState = new Map<string, KnowledgeStateEntry>();
    previousState.set('skill.solo', decayingEntry('skill.solo'));

    // Fresh review → high retention, proficient
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW, // just reviewed
      },
    ];

    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
      undefined,
      previousState,
    );
    expect(state.get('skill.solo')!.state).toBe('mastered');
  });
});

describe('getKnowledgeState — deep decay fall to inProgress', () => {
  it('falls from decaying to inProgress when retention is very low', () => {
    const previousState = new Map<string, KnowledgeStateEntry>();
    previousState.set('skill.solo', {
      nodeId: 'skill.solo',
      mastery: 0.3,
      retention: 0.25,
      isProficient: true,
      state: 'decaying',
      lastUpdated: NOW - 90 * 86_400_000,
    });

    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 1,
        lastReviewedAt: NOW - 180 * 86_400_000, // very old review
      },
    ];

    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
      undefined,
      previousState,
    );
    // With very low retention, should fall below masteryExit substantially
    // and go to inProgress (not just decaying)
    expect(state.get('skill.solo')!.state).toBe('inProgress');
  });
});

describe('getKnowledgeState — untouched nodes', () => {
  it('returns untouched for nodes with no evidence', () => {
    const state = getKnowledgeState(student, [], simpleGraph, NOW);
    expect(state.get('skill.a')!.state).toBe('untouched');
    expect(state.get('skill.b')!.state).toBe('untouched');
  });

  it('returns untouched for nodes that exist in graph but have no matching evidence', () => {
    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: true,
        stability: 30,
        lastReviewedAt: NOW,
      },
    ];
    const state = getKnowledgeState(student, evidence, simpleGraph, NOW);
    // Skill A has evidence → not untouched
    expect(state.get('skill.a')!.state).not.toBe('untouched');
    // Skill B has no evidence → untouched
    expect(state.get('skill.b')!.state).toBe('untouched');
  });
});

describe('getKnowledgeState — mastery computation', () => {
  it('computes mastery as retention * proficiency factor', () => {
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW,
      },
    ];
    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
    );
    const entry = state.get('skill.solo')!;
    // Just reviewed → retention ≈ 1.0, proficient → mastery ≈ 1.0
    expect(entry.mastery).toBeGreaterThanOrEqual(0.9);
    expect(entry.mastery).toBeLessThanOrEqual(1.0);
  });

  it('reduces mastery for not-proficient nodes', () => {
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: false,
        stability: 365,
        lastReviewedAt: NOW,
      },
    ];
    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
    );
    const entry = state.get('skill.solo')!;
    // Not proficient → mastery = retention * 0.6 ≤ 0.6
    expect(entry.mastery).toBeGreaterThanOrEqual(0);
    expect(entry.mastery).toBeLessThanOrEqual(0.6);
  });
});

describe('getKnowledgeState — pure function properties', () => {
  it('is deterministic: same inputs produce same outputs', () => {
    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: true,
        stability: 30,
        lastReviewedAt: NOW - 86_400_000,
      },
    ];
    const state1 = getKnowledgeState(student, evidence, simpleGraph, NOW);
    const state2 = getKnowledgeState(student, evidence, simpleGraph, NOW);
    for (const [nodeId, entry1] of state1) {
      const entry2 = state2.get(nodeId);
      expect(entry2).toBeDefined();
      expect(entry1.state).toBe(entry2!.state);
      expect(entry1.mastery).toBe(entry2!.mastery);
      expect(entry1.retention).toBe(entry2!.retention);
    }
  });

  it('accepts MasteryThresholds overrides', () => {
    const evidence = [
      {
        sourceId: 'skill.solo',
        isProficient: true,
        stability: 30,
        lastReviewedAt: NOW - 86_400_000,
      },
    ];
    const state = getKnowledgeState(
      student,
      evidence,
      singleNodeGraph,
      NOW,
      { masteryEnter: 0.99 }, // very high bar → harder to enter mastered
    );
    // With such a high threshold, might not enter mastered
    expect(state.get('skill.solo')).toBeDefined();
  });

  it('does not modify the input evidence array', () => {
    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: true,
        stability: 30,
        lastReviewedAt: NOW,
      },
    ];
    const snapshot = JSON.parse(JSON.stringify(evidence));
    getKnowledgeState(student, evidence, simpleGraph, NOW);
    expect(evidence).toEqual(snapshot);
  });

  it('does not modify the input graph', () => {
    const graph = JSON.parse(JSON.stringify(simpleGraph)) as KnowledgeSpace;
    getKnowledgeState(student, [], graph, NOW);
    expect(graph).toEqual(JSON.parse(JSON.stringify(simpleGraph)));
  });

  it('handles an empty graph gracefully', () => {
    const state = getKnowledgeState(student, [], emptyGraph, NOW);
    expect(state.size).toBe(0);
    expect(state).toBeInstanceOf(Map);
  });

  it('all nodes in the graph appear in the output map', () => {
    const state = getKnowledgeState(student, [], simpleGraph, NOW);
    expect(state.has('skill.a')).toBe(true);
    expect(state.has('skill.b')).toBe(true);
  });

  it('each entry has the required KnowledgeStateEntry fields', () => {
    const state = getKnowledgeState(student, [], simpleGraph, NOW);
    for (const [, entry] of state) {
      expect(typeof entry.nodeId).toBe('string');
      expect(typeof entry.mastery).toBe('number');
      expect(typeof entry.retention).toBe('number');
      expect(typeof entry.isProficient).toBe('boolean');
      expect(typeof entry.state).toBe('string');
    }
  });

  it('previousState parameter is optional (backward compatible)', () => {
    // Phase 1 tests called without previousState; must still work
    const state = getKnowledgeState(student, [], simpleGraph, NOW);
    expect(state).toBeInstanceOf(Map);
    expect(state.size).toBeGreaterThan(0);
  });
});
