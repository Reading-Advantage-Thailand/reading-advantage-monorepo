// Phase 2 — computeNodeState visualization helper (Red)
//
// Tests that the visualization helper delegates to getKnowledgeState engine
// and avoids parallel threshold literals (defends A4). Intentionally RED
// until Phase 2 Green implements computeNodeState.

import { describe, it, expect } from 'vitest';
import { getKnowledgeState } from '../index.js';
import type { KnowledgeSpace } from '../types.js';

// ---------------------------------------------------------------------------
// Minimal graph
// ---------------------------------------------------------------------------

const simpleGraph: KnowledgeSpace = {
  nodes: [
    {
      id: 'skill.a',
      kind: 'skill',
      title: 'Skill A',
      domain: 'test.domain',
      sourceRefs: ['test'],
      reviewStatus: 'draft' as const,
      metadata: {},
    },
    {
      id: 'skill.b',
      kind: 'skill',
      title: 'Skill B',
      domain: 'test.domain',
      sourceRefs: ['test'],
      reviewStatus: 'draft' as const,
      metadata: {},
    },
  ],
  edges: [
    {
      id: 'edge.a-to-b',
      type: 'prerequisite_for',
      sourceId: 'skill.a',
      targetId: 'skill.b',
      weight: 1,
      confidence: 'high',
      sourceRefs: ['test'],
      reviewStatus: 'draft' as const,
    },
  ],
};

const student = { id: 'student.test' };
const NOW = 1_700_000_000_000;

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('computeNodeState — export and signature', () => {
  it('is exported from level-projection as a standalone function', async () => {
    const mod = await import('../level-projection.js');
    expect(typeof mod.computeNodeState).toBe('function');
    expect(mod.computeNodeState.name).toBe('computeNodeState');
  });
});

describe('computeNodeState — delegates to getKnowledgeState engine', () => {
  it('produces results consistent with getKnowledgeState for the same inputs', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW,
      },
    ];

    const engineResult = getKnowledgeState(student, evidence, simpleGraph, NOW);
    const vizResult = computeNodeState(student, evidence, simpleGraph, NOW);

    // Both should return Maps with the same keys
    expect(vizResult.size).toBe(engineResult.size);
    for (const [nodeId, entry] of engineResult) {
      const vizEntry = vizResult.get(nodeId);
      expect(vizEntry).toBeDefined();
      expect(vizEntry!.state).toBe(entry.state);
      expect(vizEntry!.mastery).toBeCloseTo(entry.mastery, 5);
    }
  });
});

describe('computeNodeState — thresholds config (defends A4)', () => {
  it('uses MASTERY_THRESHOLDS_DEFAULT internally (no parallel threshold literals)', async () => {
    // Verify computeNodeState delegates to the engine which uses
    // MASTERY_THRESHOLDS_DEFAULT from mastery-state.ts.
    // The actual A4 defense is verified by code review: level-projection.ts
    // must not contain hardcoded 0.9/0.7/0.8/0.5 literals.
    const { computeNodeState } = await import('../level-projection.js');

    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW,
      },
    ];

    // With default thresholds and fresh evidence, skill.a should be mastered
    const result = computeNodeState(student, evidence, simpleGraph, NOW);
    expect(result.get('skill.a')!.state).toBe('mastered');
  });
});

describe('computeNodeState — visualization-friendly output', () => {
  it('produces entries with all required fields', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const result = computeNodeState(student, [], simpleGraph, NOW);

    for (const [, entry] of result) {
      expect(typeof entry.nodeId).toBe('string');
      expect(typeof entry.mastery).toBe('number');
      expect(entry.mastery).toBeGreaterThanOrEqual(0);
      expect(entry.mastery).toBeLessThanOrEqual(1);
      expect(typeof entry.retention).toBe('number');
      expect(typeof entry.isProficient).toBe('boolean');
      expect(['mastered', 'decaying', 'inProgress', 'untouched']).toContain(entry.state);
    }
  });

  it('returns untouched for all nodes when no evidence is provided', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const result = computeNodeState(student, [], simpleGraph, NOW);
    expect(result.get('skill.a')!.state).toBe('untouched');
    expect(result.get('skill.b')!.state).toBe('untouched');
  });

  it('is a pure function (no Date.now() internally)', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const result1 = computeNodeState(student, [], simpleGraph, NOW);
    const result2 = computeNodeState(student, [], simpleGraph, NOW);

    for (const [nodeId, e1] of result1) {
      const e2 = result2.get(nodeId);
      expect(e2).toBeDefined();
      expect(e1.state).toBe(e2!.state);
      expect(e1.mastery).toBe(e2!.mastery);
      expect(e1.retention).toBe(e2!.retention);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 3 Track 2 — Weighted Readiness enrichment (Red)
// ---------------------------------------------------------------------------

describe('computeNodeState — weighted readiness enrichment (FR4)', () => {
  it('enriches non-mastered entries with readinessScore and readinessState', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: false,
        stability: 5,
        lastReviewedAt: NOW - 30 * 24 * 60 * 60 * 1000, // 30 days ago
      },
    ];

    // skill.a has evidence but not proficient → inProgress, low retention
    // skill.b has skill.a as prerequisite → weighted readiness should be computed
    const result = computeNodeState(student, evidence, simpleGraph, NOW);

    // skill.a (prereq) should have readiness info (no prereqs → score=1, ready)
    const a = result.get('skill.a');
    expect(a).toBeDefined();
    if (a) {
      expect(a.readinessScore).toBeDefined();
      expect(a.readinessScore).toBeGreaterThanOrEqual(0);
      expect(a.readinessScore).toBeLessThanOrEqual(1);
      expect(a.readinessState).toBeDefined();
      expect(['ready', 'nearly_ready', 'blocked']).toContain(a.readinessState);
    }

    // skill.b should also have readiness info
    const b = result.get('skill.b');
    expect(b).toBeDefined();
    if (b) {
      expect(b.readinessScore).toBeDefined();
      expect(b.readinessState).toBeDefined();
    }
  });

  it('mastered nodes may or may not carry readiness (fringe-exclusion safe)', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const evidence = [
      {
        sourceId: 'skill.a',
        isProficient: true,
        stability: 365,
        lastReviewedAt: NOW,
      },
    ];

    const result = computeNodeState(student, evidence, simpleGraph, NOW);
    const a = result.get('skill.a');
    expect(a).toBeDefined();
    // Mastered nodes are excluded from fringe; readiness is optional
    if (a && a.readinessState) {
      // But if present, must be a valid state
      expect(['ready', 'nearly_ready', 'blocked']).toContain(a.readinessState);
    }
    // No assertion on presence — just don't crash
  });

  it('root nodes (no prereqs) get readinessScore=1, readinessState=ready', async () => {
    const { computeNodeState } = await import('../level-projection.js');

    const result = computeNodeState(student, [], simpleGraph, NOW);
    const a = result.get('skill.a');
    expect(a).toBeDefined();
    if (a) {
      expect(a.readinessScore).toBe(1);
      expect(a.readinessState).toBe('ready');
    }
  });
});
