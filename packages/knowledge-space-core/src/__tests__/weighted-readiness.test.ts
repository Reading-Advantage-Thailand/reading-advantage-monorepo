// Phase 2 Track 2 — Weighted Readiness (Red)
//
// Tests for computeWeightedReadiness and defaultWeightedReadinessFn.
// Intentionally RED until Phase 2 Green implements the functions.

import { describe, it, expect } from 'vitest';
import type { KnowledgeSpace, KnowledgeSpaceEdge } from '../types.js';
import type { KnowledgeStateEntry } from '../index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeSkillNode(id: string): KnowledgeSpace['nodes'][number] {
  return {
    id,
    kind: 'skill',
    title: `Skill ${id}`,
    domain: 'test',
    sourceRefs: ['test'],
    reviewStatus: 'draft' as const,
    metadata: {},
  };
}

function makePrereqEdge(
  sourceId: string,
  targetId: string,
  weight: number = 1,
): KnowledgeSpaceEdge {
  return {
    id: `edge.${sourceId}->${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight,
    confidence: 'high',
    sourceRefs: ['test'],
    reviewStatus: 'draft' as const,
  };
}

function makeEntry(
  nodeId: string,
  mastery: number,
  state: KnowledgeStateEntry['state'] = 'inProgress',
): KnowledgeStateEntry {
  return {
    nodeId,
    mastery,
    retention: mastery,
    isProficient: state === 'mastered',
    state,
  };
}

// ---------------------------------------------------------------------------
// Test helper — dynamic import of computeWeightedReadiness (will fail until Green)
// ---------------------------------------------------------------------------

async function getWeightedReadiness() {
  const mod = await import('../weighted-readiness.js');
  return {
    computeWeightedReadiness: mod.computeWeightedReadiness,
    createDefaultWeightedReadinessFn: mod.createDefaultWeightedReadinessFn,
  };
}

// ---------------------------------------------------------------------------
// computeWeightedReadiness
// ---------------------------------------------------------------------------

describe('computeWeightedReadiness — no prerequisites (FR1)', () => {
  it('returns score=1, state=ready for a node with no prerequisite edges', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const graph: KnowledgeSpace = {
      nodes: [makeSkillNode('skill.leaf')],
      edges: [],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.leaf', makeEntry('skill.leaf', 0.2));

    const result = computeWeightedReadiness('skill.leaf', state, graph);
    expect(result.score).toBe(1);
    expect(result.state).toBe('ready');
  });

  it('returns score=1 for a root node (no incoming prerequisite_for edges)', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const root = makeSkillNode('skill.root');
    const child = makeSkillNode('skill.child');
    const graph: KnowledgeSpace = {
      nodes: [root, child],
      edges: [makePrereqEdge('skill.root', 'skill.child')],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.root', makeEntry('skill.root', 0.1));
    state.set('skill.child', makeEntry('skill.child', 0));

    // skill.root has outgoing edges but no incoming prerequisite edges
    const result = computeWeightedReadiness('skill.root', state, graph);
    expect(result.score).toBe(1);
    expect(result.state).toBe('ready');
  });

  it('returns score=1 when node is not in the graph at all', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const graph: KnowledgeSpace = { nodes: [], edges: [] };
    const state = new Map<string, KnowledgeStateEntry>();

    const result = computeWeightedReadiness('missing.node', state, graph);
    expect(result.score).toBe(1);
    expect(result.state).toBe('ready');
  });
});

describe('computeWeightedReadiness — full mastery (FR1)', () => {
  it('readiness ≈ 1 when all prereqs are fully mastered', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const c = makeSkillNode('skill.c');
    const graph: KnowledgeSpace = {
      nodes: [a, b, c],
      edges: [
        makePrereqEdge('skill.a', 'skill.c', 1),
        makePrereqEdge('skill.b', 'skill.c', 1),
      ],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 1.0, 'mastered'));
    state.set('skill.b', makeEntry('skill.b', 1.0, 'mastered'));
    state.set('skill.c', makeEntry('skill.c', 0));

    const result = computeWeightedReadiness('skill.c', state, graph);
    expect(result.score).toBeCloseTo(1, 5);
    expect(result.state).toBe('ready');
  });
});

describe('computeWeightedReadiness — partial mastery (FR1)', () => {
  it('computes weighted average with uniform weights', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const c = makeSkillNode('skill.c');
    const graph: KnowledgeSpace = {
      nodes: [a, b, c],
      edges: [
        makePrereqEdge('skill.a', 'skill.c', 1),
        makePrereqEdge('skill.b', 'skill.c', 1),
      ],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.8));
    state.set('skill.b', makeEntry('skill.b', 0.4));
    state.set('skill.c', makeEntry('skill.c', 0));

    // Both weight-1 prerequisites are hard gates; the weakest (0.4) blocks.
    const result = computeWeightedReadiness('skill.c', state, graph);
    expect(result.score).toBeCloseTo(0.4, 5);
    expect(result.state).toBe('blocked');
  });

  it('computes weighted average with mixed edge weights', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const c = makeSkillNode('skill.c');
    const graph: KnowledgeSpace = {
      nodes: [a, b, c],
      edges: [
        makePrereqEdge('skill.a', 'skill.c', 0.5),
        makePrereqEdge('skill.b', 'skill.c', 1.0),
      ],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.9));
    state.set('skill.b', makeEntry('skill.b', 0.3));
    state.set('skill.c', makeEntry('skill.c', 0));

    // Hard gate 0.3 × soft component 0.9 = 0.27.
    const result = computeWeightedReadiness('skill.c', state, graph);
    expect(result.score).toBeCloseTo(0.27, 5);
    expect(result.state).toBe('blocked');
  });

  it('decaying prerequisite (mastery 0.6) gives nearly_ready', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [makePrereqEdge('skill.a', 'skill.b', 1)],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.6, 'decaying'));
    state.set('skill.b', makeEntry('skill.b', 0));

    const result = computeWeightedReadiness('skill.b', state, graph);
    expect(result.score).toBeCloseTo(0.6, 5);
    expect(result.state).toBe('nearly_ready');
  });
});

describe('computeWeightedReadiness — edge cases', () => {
  it('when all edge weights are zero, readiness = 1', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [makePrereqEdge('skill.a', 'skill.b', 0)],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.3));
    state.set('skill.b', makeEntry('skill.b', 0));

    // totalWeight = 0 → readiness = 1 (no meaningful prereqs)
    const result = computeWeightedReadiness('skill.b', state, graph);
    expect(result.score).toBe(1);
    expect(result.state).toBe('ready');
  });

  it('prerequisite node not in state map → mastery 0', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [makePrereqEdge('skill.a', 'skill.b', 1)],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    // skill.a NOT in state map → default mastery 0
    state.set('skill.b', makeEntry('skill.b', 0));

    const result = computeWeightedReadiness('skill.b', state, graph);
    expect(result.score).toBe(0);
    expect(result.state).toBe('blocked');
  });

  it('only prerequisite_for edges are considered (ignores other edge types)', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makePrereqEdge('skill.a', 'skill.b', 1),
        {
          id: 'edge.support',
          type: 'supports',
          sourceId: 'skill.a',
          targetId: 'skill.b',
          weight: 0.1,
          confidence: 'high' as const,
          sourceRefs: ['test'],
          reviewStatus: 'draft' as const,
        },
      ],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.9));
    state.set('skill.b', makeEntry('skill.b', 0));

    // Only prerequisite_for edge is used; supports edge is ignored
    const result = computeWeightedReadiness('skill.b', state, graph);
    expect(result.score).toBeCloseTo(0.9, 5);
  });

  it('respects custom thresholds', async () => {
    const { computeWeightedReadiness } = await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [makePrereqEdge('skill.a', 'skill.b', 1)],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.7));
    state.set('skill.b', makeEntry('skill.b', 0));

    // With strict thresholds (readyThreshold=0.90), 0.7 should be blocked
    const result = computeWeightedReadiness('skill.b', state, graph, {
      readyThreshold: 0.9,
      nearThreshold: 0.8,
    });
    expect(result.score).toBeCloseTo(0.7, 5);
    expect(result.state).toBe('blocked');
  });
});

// ---------------------------------------------------------------------------
// createDefaultWeightedReadinessFn (ReadinessFn factory)
// ---------------------------------------------------------------------------

describe('createDefaultWeightedReadinessFn', () => {
  it('returns a function with the ReadinessFn signature', async () => {
    const { createDefaultWeightedReadinessFn } = await getWeightedReadiness();
    const graph: KnowledgeSpace = {
      nodes: [makeSkillNode('skill.a')],
      edges: [],
    };
    const fn = createDefaultWeightedReadinessFn(graph);
    expect(typeof fn).toBe('function');
  });

  it('the returned function returns a number in [0, 1]', async () => {
    const { createDefaultWeightedReadinessFn } = await getWeightedReadiness();
    const graph: KnowledgeSpace = {
      nodes: [makeSkillNode('skill.a')],
      edges: [],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.5));

    const fn = createDefaultWeightedReadinessFn(graph);
    const score = fn('skill.a', state);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });

  it('returns the same score as computeWeightedReadiness', async () => {
    const { computeWeightedReadiness, createDefaultWeightedReadinessFn } =
      await getWeightedReadiness();
    const a = makeSkillNode('skill.a');
    const b = makeSkillNode('skill.b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [makePrereqEdge('skill.a', 'skill.b', 0.7)],
    };
    const state = new Map<string, KnowledgeStateEntry>();
    state.set('skill.a', makeEntry('skill.a', 0.7));
    state.set('skill.b', makeEntry('skill.b', 0));

    const fn = createDefaultWeightedReadinessFn(graph);
    const fnScore = fn('skill.b', state);
    const directScore = computeWeightedReadiness('skill.b', state, graph).score;
    expect(fnScore).toBe(directScore);
  });
});
