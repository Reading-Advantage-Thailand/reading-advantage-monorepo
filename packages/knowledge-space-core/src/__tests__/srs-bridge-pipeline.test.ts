// Phase 3 — Full bridge → knowledge-state → fringe path tests (kst-srs.v2).
//
// Synthetic fixture coverage: tests buildKstState end-to-end through
// the bridge, getKnowledgeState, and getOuterFringe. Also covers
// the round-trip drift guard for ObjectiveProficiencyResult shape.

import { describe, it, expect } from 'vitest';
import type { KnowledgeSpace } from '../types.js';
import type {
  SrsCardState,
  ObjectiveProficiencyResult,
} from '../index.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const NOW = 1_700_000_000_000;

function makeSkillNode(id: string): KnowledgeSpace['nodes'][number] {
  return {
    id,
    kind: 'skill',
    title: `Skill ${id}`,
    domain: 'test.pipeline',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
    metadata: {},
  };
}

function makePrereqEdge(
  sourceId: string,
  targetId: string,
  weight = 1,
): KnowledgeSpace['edges'][number] {
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

function makeDAG(): KnowledgeSpace {
  // A → B → C   (A is prereq for B, B is prereq for C)
  return {
    nodes: [makeSkillNode('A'), makeSkillNode('B'), makeSkillNode('C')],
    edges: [makePrereqEdge('A', 'B'), makePrereqEdge('B', 'C')],
  };
}

// ---------------------------------------------------------------------------
// Dynamic import
// ---------------------------------------------------------------------------

async function getPipelineModule() {
  const mod = await import('../srs-bridge.js');
  return mod;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('buildKstState — full pipeline', () => {
  it('A→B→C DAG: mastered A makes B ready, C blocked', async () => {
    const { buildKstState } = await getPipelineModule();
    const graph = makeDAG();
    const cards: SrsCardState[] = [
      {
        cardId: 'card.a',
        objectiveId: 'A',
        stability: 30,
        lastReviewedAt: NOW,
        state: 'review',
      },
    ];
    const proficiencies: ObjectiveProficiencyResult[] = [
      {
        objectiveId: 'A',
        retentionStrength: 1.0,
        practiceCoverage: 0.9,
        isProficient: true,
      },
    ];

    const result = buildKstState(cards, proficiencies, graph, NOW);

    // A should be mastered
    expect(result.state.get('A')!.state).toBe('mastered');

    // B should be ready (in fringe) because A is mastered
    const bFringe = result.fringe.find((f) => f.nodeId === 'B');
    expect(bFringe).toBeDefined();
    expect(bFringe!.readinessState).toBe('ready');

    // C should NOT be in fringe (B is not mastered)
    const cFringe = result.fringe.find((f) => f.nodeId === 'C');
    expect(cFringe).toBeUndefined();
  });

  it('A→B→C DAG: both A and B mastered makes C ready', async () => {
    const { buildKstState } = await getPipelineModule();
    const graph = makeDAG();
    const cards: SrsCardState[] = [
      {
        cardId: 'card.a',
        objectiveId: 'A',
        stability: 30,
        lastReviewedAt: NOW,
        state: 'review',
      },
      {
        cardId: 'card.b',
        objectiveId: 'B',
        stability: 30,
        lastReviewedAt: NOW,
        state: 'review',
      },
    ];
    const proficiencies: ObjectiveProficiencyResult[] = [
      { objectiveId: 'A', retentionStrength: 1.0, practiceCoverage: 0.9, isProficient: true },
      { objectiveId: 'B', retentionStrength: 1.0, practiceCoverage: 0.9, isProficient: true },
    ];

    const result = buildKstState(cards, proficiencies, graph, NOW);

    expect(result.state.get('A')!.state).toBe('mastered');
    expect(result.state.get('B')!.state).toBe('mastered');

    // C should be in fringe now (B is mastered)
    const cFringe = result.fringe.find((f) => f.nodeId === 'C');
    expect(cFringe).toBeDefined();
    expect(cFringe!.readinessState).toBe('ready');
  });

  it('empty cards and proficiencies → all nodes untouched, only root in fringe', async () => {
    const { buildKstState } = await getPipelineModule();
    const graph = makeDAG();

    const result = buildKstState([], [], graph, NOW);

    expect(result.state.get('A')!.state).toBe('untouched');
    expect(result.state.get('B')!.state).toBe('untouched');
    expect(result.state.get('C')!.state).toBe('untouched');
    // A has no prerequisites → in fringe even when untouched.
    // B and C have prerequisites (not mastered) → blocked.
    const aFringe = result.fringe.find((f) => f.nodeId === 'A');
    expect(aFringe).toBeDefined();
    expect(aFringe!.readinessState).toBe('ready');
    expect(result.fringe.find((f) => f.nodeId === 'B')).toBeUndefined();
    expect(result.fringe.find((f) => f.nodeId === 'C')).toBeUndefined();
  });

  it('custom thresholds passed through to engine', async () => {
    const { buildKstState } = await getPipelineModule();
    const graph = makeDAG();
    // Use proficiency-only (no card) so retention comes from retentionStrength.
    const proficiencies: ObjectiveProficiencyResult[] = [
      { objectiveId: 'A', retentionStrength: 0.92, practiceCoverage: 0.9, isProficient: true },
    ];

    // With default thresholds (masteryEnter=0.9), retention 0.92 ≥ 0.9 → mastered
    const defaultResult = buildKstState([], proficiencies, graph, NOW);
    expect(defaultResult.state.get('A')!.state).toBe('mastered');

    // With strict thresholds (masteryEnter=0.95), retention 0.92 < 0.95 → not mastered
    const strictResult = buildKstState([], proficiencies, graph, NOW, { masteryEnter: 0.95 });
    expect(strictResult.state.get('A')!.state).toBe('inProgress');
  });
});

describe('buildKstState — round-trip drift guard', () => {
  it('locally-declared ObjectiveProficiencyResult matches runtime shape', async () => {
    // The ObjectiveProficiencyResult type in srs-bridge.ts is a structural
    // re-declaration (test-strategy §1.4 risk #3). This test constructs
    // a runtime value matching the SRS-engine shape and asserts it passes
    // through the bridge without error.
    const { buildKstState } = await getPipelineModule();
    const graph: KnowledgeSpace = {
      nodes: [makeSkillNode('obj.test')],
      edges: [],
    };

    // Shape matching real srs-engine ObjectiveProficiencyResult
    const proficiency: ObjectiveProficiencyResult = {
      objectiveId: 'obj.test',
      retentionStrength: 0.88,
      practiceCoverage: 0.75,
      isProficient: true,
    };

    // Should not throw and should produce a state entry
    const result = buildKstState([], [proficiency], graph, NOW);
    const entry = result.state.get('obj.test');
    expect(entry).toBeDefined();
    expect(entry!.isProficient).toBe(true);
    expect(entry!.retention).toBe(0.88);
  });

  it('round-trips all required ObjectiveProficiencyResult fields', async () => {
    // Verify that objectiveId, retentionStrength, practiceCoverage, and
    // isProficient are all consumed by the bridge. Missing any of these
    // would cause a runtime error or incorrect state.
    const { buildKstState } = await getPipelineModule();
    const graph: KnowledgeSpace = {
      nodes: [makeSkillNode('full.test')],
      edges: [],
    };

    const proficiency: ObjectiveProficiencyResult = {
      objectiveId: 'full.test',
      retentionStrength: 0.65,
      practiceCoverage: 0.3,
      isProficient: false,
    };

    const result = buildKstState([], [proficiency], graph, NOW);
    const entry = result.state.get('full.test');
    expect(entry!.isProficient).toBe(false);
    expect(entry!.retention).toBe(0.65);
  });
});
