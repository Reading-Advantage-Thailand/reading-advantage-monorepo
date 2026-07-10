import { describe, it, expect } from 'vitest';
import {
  findCrossCourseEquivalences,
  validateCrossCourseEdges,
  computeEquivalenceComponents,
} from '../cross-course-equivalence.js';
import type { KnowledgeSpaceNode, KnowledgeSpaceEdge } from '../types.js';

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
    title: id.split('.').pop() ?? id,
    domain: id.split('.').slice(0, 2).join('.'),
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata: meta,
  };
}

/** Create a standard node for testing alignment edges. */
function makeStandardNode(id: string): KnowledgeSpaceNode {
  return {
    id,
    kind: 'standard',
    title: id,
    domain: 'math.standard',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata: {},
  };
}

/** Create a knowledge space edge with given properties for testing. */
function makeEdge(
  id: string,
  type: KnowledgeSpaceEdge['type'],
  sourceId: string,
  targetId: string,
  conf: KnowledgeSpaceEdge['confidence'] = 'high',
  meta?: Record<string, unknown>,
): KnowledgeSpaceEdge {
  return {
    id,
    type,
    sourceId,
    targetId,
    weight: 1.0,
    confidence: conf,
    reviewStatus: 'draft',
    derived: true,
    derivationMethod: 'synthetic',
    metadata: meta,
  };
}

// ---------------------------------------------------------------------------
// Phase 1.1 — Endpoint validation tests
// ---------------------------------------------------------------------------

describe('validateCrossCourseEdges', () => {
  it('rejects edge with source and target in the same course', () => {
    const nodes: KnowledgeSpaceNode[] = [
      makeNode('math.im1.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
      makeNode('math.im1.skill.solve-quadratic', 'skill', { familyKey: 'solve_quadratic' }),
    ];
    const edge: KnowledgeSpaceEdge = makeEdge(
      'test.edge.001',
      'equivalent_to',
      'math.im1.skill.factor-quadratic',
      'math.im1.skill.solve-quadratic',
      'low',
    );

    const result = validateCrossCourseEdges(edge, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('same course');
  });

  it('rejects edge with non-existent source endpoint', () => {
    const nodes: KnowledgeSpaceNode[] = [
      makeNode('math.im2.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
    ];
    const edge: KnowledgeSpaceEdge = makeEdge(
      'test.edge.001',
      'equivalent_to',
      'math.im1.skill.factor-quadratic',
      'math.im2.skill.factor-quadratic',
      'high',
    );

    const result = validateCrossCourseEdges(edge, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('does not exist');
  });

  it('rejects edge with non-existent target endpoint', () => {
    const nodes: KnowledgeSpaceNode[] = [
      makeNode('math.im1.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
    ];
    const edge: KnowledgeSpaceEdge = makeEdge(
      'test.edge.001',
      'equivalent_to',
      'math.im1.skill.factor-quadratic',
      'math.im2.skill.factor-quadratic',
      'high',
    );

    const result = validateCrossCourseEdges(edge, nodes);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('does not exist');
  });

  it('accepts valid cross-course edge with existing endpoints', () => {
    const nodes: KnowledgeSpaceNode[] = [
      makeNode('math.im1.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
      makeNode('math.im2.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
    ];
    const edge: KnowledgeSpaceEdge = makeEdge(
      'test.edge.001',
      'equivalent_to',
      'math.im1.skill.factor-quadratic',
      'math.im2.skill.factor-quadratic',
      'high',
    );

    const result = validateCrossCourseEdges(edge, nodes);
    expect(result.valid).toBe(true);
  });

  it('accepts reversed edge (source from different course than target)', () => {
    const nodes: KnowledgeSpaceNode[] = [
      makeNode('math.im1.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
      makeNode('math.im2.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
    ];
    const edge: KnowledgeSpaceEdge = makeEdge(
      'test.edge.001',
      'equivalent_to',
      'math.im2.skill.factor-quadratic',
      'math.im1.skill.factor-quadratic',
      'high',
    );

    const result = validateCrossCourseEdges(edge, nodes);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Phase 1.2 — familyKey and standard match tests
// ---------------------------------------------------------------------------

describe('findCrossCourseEquivalences — familyKey matching', () => {
  it('two skills from different courses with same familyKey and shared standard → high confidence', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [
          makeNode('math.im1.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
          makeStandardNode('math.standard.ccss.hsa-sse.b.3a'),
        ],
        edges: [
          makeEdge('im1.edge.align1', 'aligned_to_standard', 'math.im1.skill.factor-quadratic', 'math.standard.ccss.hsa-sse.b.3a'),
        ],
      },
      {
        courseId: 'im2',
        nodes: [
          makeNode('math.im2.skill.factor-quadratic-advanced', 'skill', { familyKey: 'factor_quadratic' }),
          makeStandardNode('math.standard.ccss.hsa-sse.b.3a'),
        ],
        edges: [
          makeEdge('im2.edge.align1', 'aligned_to_standard', 'math.im2.skill.factor-quadratic-advanced', 'math.standard.ccss.hsa-sse.b.3a'),
        ],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    const match = edges.find(
      (e) =>
        e.type === 'equivalent_to' &&
        e.confidence === 'high' &&
        e.metadata?.familyKey === 'factor_quadratic',
    );
    expect(match).toBeTruthy();
    expect(match!.weight).toBe(1.0);
    expect(match!.derived).toBe(true);
  });

  it('two skills with same familyKey but no shared standard → medium confidence', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [
          makeNode('math.im1.skill.solve-linear', 'skill', { familyKey: 'solve_linear' }),
          makeStandardNode('math.standard.ccss.hsa-rei.b.3'),
        ],
        edges: [
          makeEdge('im1.edge.align1', 'aligned_to_standard', 'math.im1.skill.solve-linear', 'math.standard.ccss.hsa-rei.b.3'),
        ],
      },
      {
        courseId: 'precalc',
        nodes: [
          makeNode('math.precalc.skill.solve-linear', 'skill', { familyKey: 'solve_linear' }),
          makeStandardNode('math.standard.ccss.hsa-ced.a.1'),
        ],
        edges: [
          makeEdge('pre.edge.align1', 'aligned_to_standard', 'math.precalc.skill.solve-linear', 'math.standard.ccss.hsa-ced.a.1'),
        ],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    const match = edges.find(
      (e) =>
        e.type === 'equivalent_to' &&
        e.confidence === 'medium' &&
        e.metadata?.familyKey === 'solve_linear',
    );
    expect(match).toBeTruthy();
  });

  it('title-only match with no familyKey and no shared standards → low confidence review queue', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [makeNode('math.im1.skill.graph-lines', 'skill')],
        edges: [],
      },
      {
        courseId: 'im2',
        nodes: [makeNode('math.im2.skill.graph-lines', 'skill')],
        edges: [],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    const lowEdges = edges.filter((e) => e.confidence === 'low');
    expect(lowEdges.length).toBeGreaterThanOrEqual(1);

    const match = lowEdges.find(
      (e) =>
        e.sourceId === 'math.im1.skill.graph-lines' ||
        e.targetId === 'math.im1.skill.graph-lines',
    );
    expect(match).toBeTruthy();
    expect(match!.metadata?.matchType).toBe('title');
  });

  it('standard-only match without familyKey or title → medium confidence', () => {
    const sharedStandard = 'math.standard.ccss.hsf-if.c.7a';
    const courses = [
      {
        courseId: 'im2',
        nodes: [
          makeNode('math.im2.skill.graph-functions', 'skill'),
          makeStandardNode(sharedStandard),
        ],
        edges: [
          makeEdge('im2.align1', 'aligned_to_standard', 'math.im2.skill.graph-functions', sharedStandard),
        ],
      },
      {
        courseId: 'im3',
        nodes: [
          makeNode('math.im3.skill.analyze-functions', 'skill'),
          makeStandardNode(sharedStandard),
        ],
        edges: [
          makeEdge('im3.align1', 'aligned_to_standard', 'math.im3.skill.analyze-functions', sharedStandard),
        ],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    const match = edges.find(
      (e) =>
        e.type === 'equivalent_to' &&
        e.confidence === 'medium' &&
        e.metadata?.matchType === 'standard',
    );
    expect(match).toBeTruthy();
    expect(match!.metadata?.sharedStandards).toContain(sharedStandard);
  });

  it('concept node with familyKey matches skill in another course by title similarity → medium', () => {
    const courses = [
      {
        courseId: 'im3',
        nodes: [
          makeNode('math.im3.concept.quadratic-factoring', 'concept', { familyKey: 'quadratic_factoring' }),
        ],
        edges: [],
      },
      {
        courseId: 'im2',
        nodes: [
          makeNode('math.im2.skill.quadratic-factoring', 'skill'),
        ],
        edges: [],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    const match = edges.find(
      (e) =>
        e.type === 'equivalent_to' &&
        e.metadata?.familyKey === 'quadratic_factoring',
    );
    expect(match).toBeTruthy();
    expect(match!.confidence).toBe('medium');
  });
});

// ---------------------------------------------------------------------------
// Phase 1.3 — Component computation tests
// ---------------------------------------------------------------------------

describe('computeEquivalenceComponents', () => {
  it('three nodes A→B→C connected by equivalent_to form one component', () => {
    const edges: KnowledgeSpaceEdge[] = [
      makeEdge('e.001', 'equivalent_to', 'math.im1.skill.a', 'math.im2.skill.a', 'high'),
      makeEdge('e.002', 'equivalent_to', 'math.im2.skill.a', 'math.im3.skill.a', 'high'),
    ];

    const components = computeEquivalenceComponents(edges);
    expect(components).toHaveLength(1);
    expect(components[0].nodeIds).toHaveLength(3);
    expect(new Set(components[0].nodeIds)).toEqual(
      new Set(['math.im1.skill.a', 'math.im2.skill.a', 'math.im3.skill.a']),
    );
  });

  it('disconnected equivalence edges produce separate components', () => {
    const edges: KnowledgeSpaceEdge[] = [
      makeEdge('e.001', 'equivalent_to', 'math.im1.skill.a', 'math.im2.skill.a', 'high'),
      makeEdge('e.002', 'equivalent_to', 'math.im1.skill.b', 'math.im3.skill.b', 'high'),
    ];

    const components = computeEquivalenceComponents(edges);
    expect(components).toHaveLength(2);
  });

  it('component listing is deterministic (sorted by componentId)', () => {
    const edges: KnowledgeSpaceEdge[] = [
      makeEdge('e.003', 'equivalent_to', 'math.im1.skill.c', 'math.im3.skill.c', 'high'),
      makeEdge('e.001', 'equivalent_to', 'math.im1.skill.a', 'math.im2.skill.a', 'high'),
      makeEdge('e.002', 'equivalent_to', 'math.im2.skill.b', 'math.precalc.skill.b', 'high'),
    ];

    const first = computeEquivalenceComponents(edges);
    const second = computeEquivalenceComponents(
      [...edges].sort(() => Math.random() - 0.5),
    );
    expect(first.map((c) => c.componentId)).toEqual(second.map((c) => c.componentId));
  });

  it('each component lists distinct courses', () => {
    const edges: KnowledgeSpaceEdge[] = [
      makeEdge('e.001', 'equivalent_to', 'math.im1.skill.a', 'math.im2.skill.a', 'high'),
      makeEdge('e.002', 'equivalent_to', 'math.im2.skill.a', 'math.im3.skill.a', 'high'),
    ];

    const components = computeEquivalenceComponents(edges);
    for (const comp of components) {
      const courses = new Set(comp.courses);
      expect(courses.size).toBe(comp.courses.length);
    }
  });

  it('empty edges returns empty components array', () => {
    const components = computeEquivalenceComponents([]);
    expect(components).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Edge schema conformance
// ---------------------------------------------------------------------------

describe('findCrossCourseEquivalences — schema conformance', () => {
  it('all generated equivalences have required fields', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [
          makeNode('math.im1.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
          makeStandardNode('math.standard.ccss.hsa-sse.b.3a'),
        ],
        edges: [
          makeEdge('im1.align1', 'aligned_to_standard', 'math.im1.skill.factor-quadratic', 'math.standard.ccss.hsa-sse.b.3a'),
        ],
      },
      {
        courseId: 'im2',
        nodes: [
          makeNode('math.im2.skill.factor-quadratic', 'skill', { familyKey: 'factor_quadratic' }),
          makeStandardNode('math.standard.ccss.hsa-sse.b.3a'),
        ],
        edges: [
          makeEdge('im2.align1', 'aligned_to_standard', 'math.im2.skill.factor-quadratic', 'math.standard.ccss.hsa-sse.b.3a'),
        ],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    expect(edges.length).toBeGreaterThan(0);
    for (const e of edges) {
      expect(e.id).toBeTruthy();
      expect(e.type).toBe('equivalent_to');
      expect(e.sourceId).toBeTruthy();
      expect(e.targetId).toBeTruthy();
      expect(typeof e.weight).toBe('number');
      expect(['low', 'medium', 'high']).toContain(e.confidence);
      expect(e.reviewStatus).toBe('draft');
      expect(e.derived).toBe(true);
      expect(e.derivationMethod).toBeTruthy();
    }
  });

  it('no equivalent_to edge has source and target in the same course', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [
          makeNode('math.im1.skill.a', 'skill', { familyKey: 'topic_a' }),
          makeNode('math.im1.skill.b', 'skill', { familyKey: 'topic_a' }),
        ],
        edges: [],
      },
      {
        courseId: 'im2',
        nodes: [
          makeNode('math.im2.skill.a', 'skill', { familyKey: 'topic_a' }),
        ],
        edges: [],
      },
    ];

    const edges = findCrossCourseEquivalences({ courses });
    for (const e of edges) {
      const sourceCourse = e.sourceId.split('.').slice(0, 2).join('.');
      const targetCourse = e.targetId.split('.').slice(0, 2).join('.');
      expect(sourceCourse).not.toBe(targetCourse);
    }
  });

  it('deterministic output ordering', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [makeNode('math.im1.skill.a', 'skill', { familyKey: 'topic_a' })],
        edges: [],
      },
      {
        courseId: 'im2',
        nodes: [makeNode('math.im2.skill.a', 'skill', { familyKey: 'topic_a' })],
        edges: [],
      },
    ];

    const first = findCrossCourseEquivalences({ courses });
    const second = findCrossCourseEquivalences({
      courses: [
        courses[1],
        courses[0],
      ],
    });
    expect(first.map((e) => e.id)).toEqual(second.map((e) => e.id));
  });

  it('handles empty courses gracefully', () => {
    expect(() =>
      findCrossCourseEquivalences({ courses: [] }),
    ).not.toThrow();
    expect(findCrossCourseEquivalences({ courses: [] })).toEqual([]);
  });

  it('handles single course gracefully (no cross-course pairs possible)', () => {
    const courses = [
      {
        courseId: 'im1',
        nodes: [makeNode('math.im1.skill.a', 'skill', { familyKey: 'topic_a' })],
        edges: [],
      },
    ];
    expect(findCrossCourseEquivalences({ courses })).toEqual([]);
  });
});
