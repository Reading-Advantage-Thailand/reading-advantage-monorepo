import { describe, it, expect } from 'vitest';
import { suggestEdges } from '../edge-suggestions.js';
import type { KnowledgeSpaceNode } from '../types.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a knowledge space node with given kind and metadata for testing. */
function makeNode(
  id: string,
  kind: KnowledgeSpaceNode['kind'],
  meta: Record<string, unknown> = {},
): KnowledgeSpaceNode {
  return {
    id,
    kind,
    title: id,
    domain: 'math.test',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata: meta,
  };
}

const COURSE_PREFIX = 'math.test';

/** Build a minimal synthetic hierarchy: 1 domain, 1 module, 2 lessons, 2 skills each. */
function buildSyntheticNodes(): KnowledgeSpaceNode[] {
  return [
    makeNode('math.test', 'domain'),
    makeNode('math.test.module.1', 'content_group', { module: '1' }),
    makeNode('math.test.lesson.1.1', 'instructional_unit', { module: '1', lesson: '1' }),
    makeNode('math.test.lesson.1.2', 'instructional_unit', { module: '1', lesson: '2' }),
    makeNode('math.test.skill.1.1.alpha', 'skill', { module: '1', lesson: '1' }),
    makeNode('math.test.skill.1.1.beta', 'skill', { module: '1', lesson: '1' }),
    makeNode('math.test.skill.1.2.gamma', 'skill', { module: '1', lesson: '2' }),
    makeNode('math.test.example.1.1.001', 'worked_example', { module: '1', lesson: '1' }),
    makeNode('math.test.example.1.2.001', 'worked_example', { module: '1', lesson: '2' }),
  ];
}

// ---------------------------------------------------------------------------
// Task 1.3 — Deterministic edge ordering
// ---------------------------------------------------------------------------

describe('suggestEdges — determinism', () => {
  it('returns the same edges in the same order on repeated calls', () => {
    const nodes = buildSyntheticNodes();
    const first = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const second = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    expect(first.length).toBe(second.length);
    for (let i = 0; i < first.length; i++) {
      expect(first[i].id).toBe(second[i].id);
      expect(first[i].type).toBe(second[i].type);
      expect(first[i].sourceId).toBe(second[i].sourceId);
      expect(first[i].targetId).toBe(second[i].targetId);
    }
  });

  it('produces stable IDs when node array order is shuffled', () => {
    const nodes = buildSyntheticNodes();
    const shuffled = [...nodes].reverse();
    const fromOriginal = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const fromShuffled = suggestEdges({ nodes: shuffled, coursePrefix: COURSE_PREFIX });
    const ids1 = fromOriginal.map((e) => e.id).sort();
    const ids2 = fromShuffled.map((e) => e.id).sort();
    expect(ids1).toEqual(ids2);
  });

  it('edge IDs are unique within a suggestion run', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const ids = edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ---------------------------------------------------------------------------
// Phase 2.1 — Containment edges
// ---------------------------------------------------------------------------

describe('suggestEdges — containment', () => {
  it('generates domain → module contains edge', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const containment = edges.filter((e) => e.type === 'contains');
    expect(containment.some((e) => e.sourceId === 'math.test' && e.targetId === 'math.test.module.1')).toBe(true);
  });

  it('generates module → lesson contains edges', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const containment = edges.filter((e) => e.type === 'contains');
    expect(containment.some((e) => e.sourceId === 'math.test.module.1' && e.targetId === 'math.test.lesson.1.1')).toBe(true);
    expect(containment.some((e) => e.sourceId === 'math.test.module.1' && e.targetId === 'math.test.lesson.1.2')).toBe(true);
  });

  it('generates lesson → skill contains edges', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const containment = edges.filter((e) => e.type === 'contains');
    expect(containment.some((e) => e.sourceId === 'math.test.lesson.1.1' && e.targetId === 'math.test.skill.1.1.alpha')).toBe(true);
    expect(containment.some((e) => e.sourceId === 'math.test.lesson.1.1' && e.targetId === 'math.test.skill.1.1.beta')).toBe(true);
  });

  it('generates lesson → worked_example contains edges', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const containment = edges.filter((e) => e.type === 'contains');
    expect(containment.some((e) => e.sourceId === 'math.test.lesson.1.1' && e.targetId === 'math.test.example.1.1.001')).toBe(true);
  });

  it('containment edges have high confidence and weight 1.0', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const containment = edges.filter((e) => e.type === 'contains');
    for (const e of containment) {
      expect(e.confidence).toBe('high');
      expect(e.weight).toBe(1.0);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 2.2 — Placement (appears_in_context) edges
// ---------------------------------------------------------------------------

describe('suggestEdges — appears_in_context', () => {
  it('generates skill → lesson appears_in_context edges', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const placements = edges.filter((e) => e.type === 'appears_in_context');
    expect(placements.some((e) => e.sourceId === 'math.test.skill.1.1.alpha' && e.targetId === 'math.test.lesson.1.1')).toBe(true);
  });

  it('generates worked_example → lesson appears_in_context edges', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const placements = edges.filter((e) => e.type === 'appears_in_context');
    expect(placements.some((e) => e.sourceId === 'math.test.example.1.1.001' && e.targetId === 'math.test.lesson.1.1')).toBe(true);
  });

  it('appears_in_context edges have medium confidence and weight 0.75', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const placements = edges.filter((e) => e.type === 'appears_in_context');
    expect(placements.length).toBeGreaterThan(0);
    for (const e of placements) {
      expect(e.confidence).toBe('medium');
      expect(e.weight).toBe(0.75);
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 2.3 — Prerequisite edges
// ---------------------------------------------------------------------------

describe('suggestEdges — prerequisite_for', () => {
  it('generates lesson-sequence prerequisite_for edges across consecutive lessons', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const prereqs = edges.filter((e) => e.type === 'prerequisite_for');
    // Lesson 1.1 skills should be prerequisite for lesson 1.2 skills
    const l11to12 = prereqs.filter((e) =>
      e.sourceId.includes('1.1') && e.targetId.includes('1.2'),
    );
    expect(l11to12.length).toBeGreaterThan(0);
  });

  it('prerequisite_for edges have low confidence and weight 0.5', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const prereqs = edges.filter((e) => e.type === 'prerequisite_for');
    expect(prereqs.length).toBeGreaterThan(0);
    for (const e of prereqs) {
      expect(e.confidence).toBe('low');
      expect(e.weight).toBe(0.5);
    }
  });

  it('prerequisite_for edges are marked derived with derivationMethod', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    const prereqs = edges.filter((e) => e.type === 'prerequisite_for');
    for (const e of prereqs) {
      expect(e.derived).toBe(true);
      expect(e.derivationMethod).toBeTruthy();
    }
  });
});

// ---------------------------------------------------------------------------
// Phase 2.4 — Support edges (concept → skill)
// ---------------------------------------------------------------------------

describe('suggestEdges — concept supports skill', () => {
  it('generates concept → skill supports edges within the same module', () => {
    const nodesWithConcept = [
      ...buildSyntheticNodes(),
      makeNode('math.test.skill.1.aleks.alpha-concept', 'concept', { module: '1' }),
    ];
    const edges = suggestEdges({ nodes: nodesWithConcept, coursePrefix: COURSE_PREFIX });
    const supports = edges.filter((e) => e.type === 'supports');
    expect(supports.some((e) => e.sourceId === 'math.test.skill.1.aleks.alpha-concept')).toBe(true);
  });

  it('supports edges from concepts have medium confidence and weight 0.75', () => {
    const nodesWithConcept = [
      ...buildSyntheticNodes(),
      makeNode('math.test.skill.1.aleks.alpha-concept', 'concept', { module: '1' }),
    ];
    const edges = suggestEdges({ nodes: nodesWithConcept, coursePrefix: COURSE_PREFIX });
    const conceptSupports = edges.filter(
      (e) => e.type === 'supports' && e.sourceId.includes('aleks'),
    );
    expect(conceptSupports.length).toBeGreaterThan(0);
    for (const e of conceptSupports) {
      expect(e.confidence).toBe('medium');
      expect(e.weight).toBe(0.75);
    }
  });
});

// ---------------------------------------------------------------------------
// Edge schema conformance
// ---------------------------------------------------------------------------

describe('suggestEdges — schema conformance', () => {
  it('all suggested edges have required fields', () => {
    const nodes = buildSyntheticNodes();
    const edges = suggestEdges({ nodes, coursePrefix: COURSE_PREFIX });
    for (const e of edges) {
      expect(e.id).toBeTruthy();
      expect(e.type).toBeTruthy();
      expect(e.sourceId).toBeTruthy();
      expect(e.targetId).toBeTruthy();
      expect(typeof e.weight).toBe('number');
      expect(['low', 'medium', 'high']).toContain(e.confidence);
      expect(e.reviewStatus).toBe('draft');
    }
  });

  it('uses only spec-defined edge weights', () => {
    const nodesWithConcept = [
      ...buildSyntheticNodes(),
      makeNode('math.test.skill.1.aleks.alpha-concept', 'concept', {
        module: '1',
        familyKey: 'alpha',
      }),
      makeNode('math.test.skill.1.aleks.beta-concept', 'concept', {
        module: '1',
        familyKey: 'alpha',
      }),
    ];
    const edges = suggestEdges({ nodes: nodesWithConcept, coursePrefix: COURSE_PREFIX });
    const allowedWeights = new Set([1.0, 0.75, 0.5, 0.25]);
    expect(edges.every((e) => allowedWeights.has(e.weight))).toBe(true);
  });

  it('handles a graph with no skills or concepts gracefully (PreCalc-style)', () => {
    const precalcNodes = [
      makeNode('math.precalc', 'domain'),
      makeNode('math.precalc.module.1', 'content_group', { module: '1' }),
      makeNode('math.precalc.lesson.1.1', 'instructional_unit', { module: '1', lesson: '1' }),
      makeNode('math.precalc.example.1.1.001', 'worked_example', { module: '1', lesson: '1' }),
    ];
    expect(() => suggestEdges({ nodes: precalcNodes, coursePrefix: 'math.precalc' })).not.toThrow();
    const edges = suggestEdges({ nodes: precalcNodes, coursePrefix: 'math.precalc' });
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((e) => e.sourceId && e.targetId)).toBe(true);
  });
});
