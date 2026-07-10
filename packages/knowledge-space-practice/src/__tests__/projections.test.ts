import { describe, it, expect } from 'vitest';
import {
  syntheticMathFixture,
  syntheticEnglishGseFixture,
} from '@reading-advantage/knowledge-space-core';
import type { KnowledgeSpaceNode, KnowledgeSpaceEdge } from '@reading-advantage/knowledge-space-core';
import type { KnowledgeBlueprint } from '../blueprints/index.js';

import { projectActivityMap, findChildSkills, selectSkill } from '../projections/activity-map.js';
import { projectSrsInputs } from '../projections/srs.js';
import { projectTeacherEvidence } from '../projections/teacher-evidence.js';
import {
  projectStudentVisualization,
  projectParentVisualization,
  projectTeacherVisualization,
} from '../projections/visualization.js';

import {
  studentVisualizationV1Schema,
  parentVisualizationV1Schema,
  teacherVisualizationV1Schema,
} from '../projections/schemas.js';

import {
  syntheticBlueprint,
  syntheticEnglishBlueprintProjection,
  syntheticLearnerState,
} from '../projections/fixtures.js';

import { getRecommendedNext } from '../planner/recommended-next.js';
import { defaultPriorityWeights } from './planner-fixtures.js';

// ---------------------------------------------------------------------------
// Task 1.1: Activity map projection test
// ---------------------------------------------------------------------------
describe('Activity map projection', () => {
  it('produces valid activity map rows from synthetic math fixture + blueprint', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;
    const blueprints: KnowledgeBlueprint[] = [syntheticBlueprint];

    const rows = projectActivityMap(nodes, edges, blueprints);

    expect(rows.length).toBeGreaterThan(0);

    for (const row of rows) {
      expect(row).toHaveProperty('stableActivityId');
      expect(row).toHaveProperty('nodeId');
      expect(row).toHaveProperty('sourceNodeIds');
      expect(row).toHaveProperty('rendererKey');
      expect(row).toHaveProperty('mode');
      expect(row).toHaveProperty('alignmentNodeIds');
      expect(row).toHaveProperty('props');
      expect(row).toHaveProperty('gradingConfig');
      expect(row).toHaveProperty('srsEligible');

      expect(typeof row.stableActivityId).toBe('string');
      expect(typeof row.nodeId).toBe('string');
      expect(Array.isArray(row.sourceNodeIds)).toBe(true);
      expect(typeof row.rendererKey).toBe('string');
      expect([
        'worked_example',
        'guided_practice',
        'independent_practice',
        'assessment',
      ]).toContain(row.mode);
      expect(Array.isArray(row.alignmentNodeIds)).toBe(true);
    }
  });

  it('includes knowledge-space provenance in activity map rows', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;
    const blueprints: KnowledgeBlueprint[] = [syntheticBlueprint];

    const rows = projectActivityMap(nodes, edges, blueprints);

    const factoringRow = rows.find((r) =>
      r.nodeId.includes('factoring-drill'),
    );
    expect(factoringRow).toBeDefined();
    expect(factoringRow!.alignmentNodeIds.length).toBeGreaterThan(0);
    expect(factoringRow!.alignmentNodeIds).toContain(
      'math.im3.standard.ccss.hsa.rei.b.4b',
    );
  });
});

// ---------------------------------------------------------------------------
// Task 1.2: Component props validation test
// ---------------------------------------------------------------------------
describe('Component props validation', () => {
  it('generated activity props are well-formed', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;
    const blueprints: KnowledgeBlueprint[] = [syntheticBlueprint];

    const rows = projectActivityMap(nodes, edges, blueprints);

    for (const row of rows) {
      expect(typeof row.props).toBe('object');
      expect(row.props).not.toBeNull();
      expect(Object.keys(row.props).length).toBeGreaterThan(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 1.3: SRS projection test
// ---------------------------------------------------------------------------
describe('SRS projection', () => {
  it('includes prerequisite IDs and standard/objective IDs', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;
    const blueprints: KnowledgeBlueprint[] = [syntheticBlueprint];

    const entries = projectSrsInputs(nodes, edges, blueprints);

    expect(entries.length).toBeGreaterThan(0);

    for (const entry of entries) {
      expect(typeof entry.nodeId).toBe('string');
      expect(typeof entry.blueprintId).toBe('string');
      expect(Array.isArray(entry.standards)).toBe(true);
      expect(Array.isArray(entry.prerequisites)).toBe(true);
      expect(typeof entry.difficulty).toBe('number');
      expect(typeof entry.generatorReady).toBe('boolean');
    }

    // At least one entry should have prerequisite info
    const entryWithPrereqs = entries.find((e) => e.prerequisites.length > 0);
    expect(entryWithPrereqs).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Task 1.4: Visualization projection tests
// ---------------------------------------------------------------------------
describe('Visualization projections', () => {
  const nodes = syntheticMathFixture.nodes;
  const edges = syntheticMathFixture.edges;

  describe('Student visualization', () => {
    it('includes mastered, ready, blocked, review-due, and recommended-next states', () => {
      const viz = projectStudentVisualization(nodes, edges, syntheticLearnerState);

      expect(viz.schemaVersion).toBe('v1');
      expect(Array.isArray(viz.mastered)).toBe(true);
      expect(Array.isArray(viz.ready)).toBe(true);
      expect(Array.isArray(viz.blocked)).toBe(true);
      expect(Array.isArray(viz.reviewDue)).toBe(true);
      expect(Array.isArray(viz.recommendedNext)).toBe(true);
      expect(Array.isArray(viz.edges)).toBe(true);

      const result = studentVisualizationV1Schema.safeParse(viz);
      expect(result.success).toBe(true);
    });

    it('does not expose raw graph fields in visualization nodes', () => {
      const viz = projectStudentVisualization(nodes, edges, syntheticLearnerState);

      for (const node of viz.mastered) {
        expect(node).toHaveProperty('nodeId');
        expect(node).toHaveProperty('title');
        expect(node).toHaveProperty('state');
        expect(node).not.toHaveProperty('metadata');
        expect(node).not.toHaveProperty('sourceRefs');
        expect(node).not.toHaveProperty('reviewStatus');
      }
    });
  });

  describe('Parent visualization', () => {
    it('includes plain-language can-do summary, next focus, blockers, progress trend', () => {
      const viz = projectParentVisualization(nodes, edges, syntheticLearnerState);

      expect(viz.schemaVersion).toBe('v1');
      expect(typeof viz.canDoSummary).toBe('string');
      expect(typeof viz.nextFocus).toBe('string');
      expect(Array.isArray(viz.blockers)).toBe(true);
      expect(['improving', 'stable', 'declining', 'unknown']).toContain(
        viz.progressTrend,
      );
      expect(Array.isArray(viz.nodes)).toBe(true);

      const result = parentVisualizationV1Schema.safeParse(viz);
      expect(result.success).toBe(true);
    });
  });

  describe('Teacher visualization', () => {
    const classStats = {
      'math.im3.skill.m1.l2.solve-quadratic-by-factoring': {
        mastered: 12,
        total: 20,
      },
      'math.im3.skill.m1.l2.identify-roots': {
        mastered: 15,
        total: 20,
      },
    };

    it('includes heatmap cells, bottleneck nodes, prerequisite gaps, misconception clusters, intervention groups, standards coverage', () => {
      const viz = projectTeacherVisualization(nodes, edges, classStats);

      expect(viz.schemaVersion).toBe('v1');
      expect(Array.isArray(viz.heatmap)).toBe(true);
      expect(Array.isArray(viz.bottleneckNodes)).toBe(true);
      expect(Array.isArray(viz.prerequisiteGaps)).toBe(true);
      expect(Array.isArray(viz.misconceptionClusters)).toBe(true);
      expect(Array.isArray(viz.interventionGroups)).toBe(true);
      expect(Array.isArray(viz.standardsCoverage)).toBe(true);

      if (viz.heatmap.length > 0) {
        const cell = viz.heatmap[0];
        expect(typeof cell.nodeId).toBe('string');
        expect(typeof cell.title).toBe('string');
        expect(typeof cell.masteredCount).toBe('number');
        expect(typeof cell.totalCount).toBe('number');
        expect(typeof cell.proficiencyRate).toBe('number');
        expect(cell.proficiencyRate).toBeGreaterThanOrEqual(0);
        expect(cell.proficiencyRate).toBeLessThanOrEqual(1);
      }

      const result = teacherVisualizationV1Schema.safeParse(viz);
      expect(result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Phase 3 (Track 4 next-skill-planner_20260521) — ranked recommendedNext
  // -------------------------------------------------------------------------
  //
  // FR5: `recommendedNext` becomes top-N by `priority`, replacing the
  // pre-track `[...ready, ...unknown].slice(0, 5)` placeholder. This test
  // pins the integration: the visualization's `recommendedNext` must
  // equal the planner's top-N ranking for the same input, with
  // `defaultPriorityWeights` and N=5.
  //
  // The hand-rolled fixture below is deliberately engineered so the
  // pre-track order (`[...ready, ...unknown].sort(nodeId).slice(0, 5)`)
  // differs from the planner's order at index 1. This ensures the test
  // fails at HEAD with a live-behavior signal (not just an import
  // failure) once the planner module exists but the visualization still
  // uses the pre-track slice.
  describe('Student visualization — recommendedNext is top-N by priority (Phase 3 integration)', () => {
    const rankNodes = [
      {
        id: 'rank.z',
        kind: 'skill' as const,
        title: 'Z skill',
        domain: 'math.test.rank',
        reviewStatus: 'draft' as const,
        metadata: {},
      },
      {
        id: 'rank.a',
        kind: 'skill' as const,
        title: 'A skill',
        domain: 'math.test.rank',
        reviewStatus: 'draft' as const,
        metadata: {},
      },
      {
        id: 'rank.m',
        kind: 'skill' as const,
        title: 'M skill',
        domain: 'math.test.rank',
        reviewStatus: 'draft' as const,
        metadata: {},
      },
    ];
    const rankEdges: [] = [];
    const rankLearnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
      'rank.z': 'ready',
      'rank.a': 'ready',
    };

    it('viz.recommendedNext matches getRecommendedNext(input, defaultPriorityWeights, 5)', () => {
      const viz = projectStudentVisualization(
        rankNodes as never,
        rankEdges as never,
        rankLearnerState,
      );

      const plannerInput = {
        nodes: rankNodes.map((n) => ({ id: n.id, kind: n.kind, title: n.title, domain: n.domain })),
        edges: [],
        readinessByNode: {
          'rank.z': 0.8,
          'rank.a': 0.8,
        },
        goalNodeIds: [],
        misconceptionLinks: [],
      };
      const expected = getRecommendedNext(plannerInput, defaultPriorityWeights, 5);

      expect(viz.recommendedNext.map((n) => n.nodeId)).toEqual(expected);
    });

    it('excludes mastered, blocked, review-due, and unknown nodes from recommendedNext', () => {
      const mixedNodes = [
        {
          id: 'mixed.mastered',
          kind: 'skill' as const,
          title: 'Mastered skill',
          domain: 'math.test.rank',
          reviewStatus: 'draft' as const,
          metadata: {},
        },
        {
          id: 'mixed.blocked',
          kind: 'skill' as const,
          title: 'Blocked skill',
          domain: 'math.test.rank',
          reviewStatus: 'draft' as const,
          metadata: {},
        },
        {
          id: 'mixed.ready',
          kind: 'skill' as const,
          title: 'Ready skill',
          domain: 'math.test.rank',
          reviewStatus: 'draft' as const,
          metadata: {},
        },
        {
          id: 'mixed.unknown',
          kind: 'skill' as const,
          title: 'Unknown skill',
          domain: 'math.test.rank',
          reviewStatus: 'draft' as const,
          metadata: {},
        },
        {
          id: 'mixed.review-due',
          kind: 'skill' as const,
          title: 'Review due skill',
          domain: 'math.test.rank',
          reviewStatus: 'draft' as const,
          metadata: {},
        },
      ];
      const mixedEdges: [] = [];
      const mixedLearnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
        'mixed.mastered': 'mastered',
        'mixed.blocked': 'blocked',
        'mixed.ready': 'ready',
        'mixed.review-due': 'review_due',
      };

      const viz = projectStudentVisualization(
        mixedNodes as never,
        mixedEdges as never,
        mixedLearnerState,
      );

      const ids = viz.recommendedNext.map((n) => n.nodeId);
      expect(ids).toContain('mixed.ready');
      expect(ids).not.toContain('mixed.unknown');
      expect(ids).not.toContain('mixed.mastered');
      expect(ids).not.toContain('mixed.blocked');
      expect(ids).not.toContain('mixed.review-due');
    });
  });
});

// ---------------------------------------------------------------------------
// Task 1.5: Cross-domain smoke test
// ---------------------------------------------------------------------------
describe('Cross-domain smoke test (English/GSE)', () => {
  it('projection source files contain no math-domain or app imports (boundary check)', async () => {
    const fsModule = 'node:fs';
    const { readFileSync } = (await import(fsModule)) as {
      readFileSync: (path: URL, encoding: 'utf-8') => string;
    };
    const projectionFiles = [
      '../projections/activity-map.ts',
      '../projections/srs.ts',
      '../projections/teacher-evidence.ts',
      '../projections/visualization.ts',
      '../projections/fixtures.ts',
      '../projections/schemas.ts',
      '../projections/types.ts',
    ];
    for (const file of projectionFiles) {
      const fileUrl = new URL(file, import.meta.url);
      const content = readFileSync(fileUrl, 'utf-8');
      expect(content, `${file} must not import from apps/`).not.toMatch(/from ['"].*apps\//);
      expect(content, `${file} must not import from math-content`).not.toMatch(/from ['"].*math-content/);
      expect(content, `${file} must not import from convex/_generated`).not.toMatch(/from ['"].*convex\/_generated/);
    }
  });

  it('runs full projection pipeline on non-math fixture', () => {
    const nodes = syntheticEnglishGseFixture.nodes;
    const edges = syntheticEnglishGseFixture.edges;
    const blueprints: KnowledgeBlueprint[] = [syntheticEnglishBlueprintProjection];
    const learnerState: Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'> = {
      'english.gse.skill.b1.reading.infer-meaning-context': 'mastered',
      'english.gse.skill.b1.reading.identify-main-idea.short-text': 'ready',
    };
    const classStats = {
      'english.gse.skill.b1.reading.identify-main-idea.short-text': {
        mastered: 8,
        total: 15,
      },
    };

    // Activity map
    const activityRows = projectActivityMap(nodes, edges, blueprints);
    expect(activityRows.length).toBeGreaterThan(0);

    // SRS
    const srsEntries = projectSrsInputs(nodes, edges, blueprints);
    expect(srsEntries.length).toBeGreaterThan(0);

    // Teacher evidence
    const evidence = projectTeacherEvidence(nodes, edges);
    expect(evidence).toHaveProperty('standards');
    expect(evidence).toHaveProperty('skills');
    expect(evidence).toHaveProperty('prerequisiteGaps');
    expect(evidence).toHaveProperty('attemptArtifacts');

    // Student visualization
    const studentViz = projectStudentVisualization(nodes, edges, learnerState);
    const studentResult = studentVisualizationV1Schema.safeParse(studentViz);
    expect(studentResult.success).toBe(true);

    // Parent visualization
    const parentViz = projectParentVisualization(nodes, edges, learnerState);
    const parentResult = parentVisualizationV1Schema.safeParse(parentViz);
    expect(parentResult.success).toBe(true);

    // Teacher visualization
    const teacherViz = projectTeacherVisualization(nodes, edges, classStats);
    const teacherResult = teacherVisualizationV1Schema.safeParse(teacherViz);
    expect(teacherResult.success).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Concept Aggregator resolution (precalc-alignment-concept-taxonomy_20260510)
// FR-13: emitting all child skills — the projection must emit one row set
// per child skill of a concept node (N rows for an N-skill concept),
// not silently collapse to a single alphabetically-first skill.
// ---------------------------------------------------------------------------
describe('Concept Aggregator resolution', () => {
  const conceptNode: KnowledgeSpaceNode = {
    id: 'math.precalc.concept.unit-circle-trig',
    kind: 'concept',
    title: 'Unit Circle Trigonometry',
    description: 'Aggregator node bundling unit-circle trig skills.',
    reviewStatus: 'approved',
    metadata: {},
  };
  const skillA: KnowledgeSpaceNode = {
    id: 'math.precalc.skill.unit-circle.sin-definition',
    kind: 'skill',
    title: 'Sin from unit circle',
    reviewStatus: 'approved',
    metadata: {},
  };
  const skillB: KnowledgeSpaceNode = {
    id: 'math.precalc.skill.unit-circle.cos-definition',
    kind: 'skill',
    title: 'Cos from unit circle',
    reviewStatus: 'approved',
    metadata: {},
  };
  const skillC: KnowledgeSpaceNode = {
    id: 'math.precalc.skill.unit-circle.tan-definition',
    kind: 'skill',
    title: 'Tan from unit circle',
    reviewStatus: 'approved',
    metadata: {},
  };
  const otherConcept: KnowledgeSpaceNode = {
    id: 'math.precalc.concept.other',
    kind: 'concept',
    title: 'Other concept',
    reviewStatus: 'approved',
    metadata: {},
  };
  const conceptEdges: KnowledgeSpaceEdge[] = [
    {
      id: 'e1',
      type: 'contains',
      sourceId: conceptNode.id,
      targetId: skillA.id,
      confidence: 'high',
      weight: 1,
      reviewStatus: 'approved',
    },
    {
      id: 'e2',
      type: 'contains',
      sourceId: conceptNode.id,
      targetId: skillB.id,
      confidence: 'high',
      weight: 1,
      reviewStatus: 'approved',
    },
    {
      id: 'e3',
      type: 'contains',
      sourceId: conceptNode.id,
      targetId: skillC.id,
      confidence: 'high',
      weight: 1,
      reviewStatus: 'approved',
    },
  ];

  it('findChildSkills returns child skills of a concept via contains edges', () => {
    const childSkills = findChildSkills(conceptNode, [conceptNode, skillA, skillB, skillC, otherConcept], conceptEdges);
    const ids = childSkills.map((s) => s.id).sort();
    expect(ids).toEqual([skillB.id, skillA.id, skillC.id].sort());
  });

  it('findChildSkills returns empty for a non-concept node', () => {
    expect(findChildSkills(skillA, [skillA, skillB], conceptEdges)).toEqual([]);
  });

  it('selectSkill returns null on empty child list', () => {
    expect(selectSkill([])).toBeNull();
  });

  it('projectActivityMap emits one row per child skill for a 2-skill concept (FR-13)', () => {
    // 2-skill concept, 1 spec → 2 rows (one per child skill). Replaces
    // the prior test that asserted 1 row (the FR-20 anti-pattern that
    // certified the sibling-dropping limitation).
    const blueprint: KnowledgeBlueprint = {
      nodeId: conceptNode.id,
      sourceNodeIds: [],
      alignmentNodeIds: [],
      rendererKey: 'concept-explorer',
      independentPracticeSpec: {
        variantParameters: {},
        answerSchema: { answer: {} },
        gradingRules: [],
        replayPolicy: 'any_seed',
      },
      reviewStatus: 'draft',
      metadata: {},
    };
    // Use only 2 of the 3 skills to mirror the 2-skill original fixture
    // shape (so the assertion is "2 rows for 2 child skills" — direct
    // count, not a derived cardinality).
    const twoSkillEdges = conceptEdges.filter((e) => e.targetId !== skillC.id);
    const nodes = [conceptNode, skillA, skillB];
    const rows = projectActivityMap(nodes, twoSkillEdges, [blueprint]);
    expect(rows).toHaveLength(2);
    const rowNodeIds = rows.map((r) => r.nodeId).sort();
    expect(rowNodeIds).toEqual([skillA.id, skillB.id].sort());
    for (const r of rows) {
      expect(r.stableActivityId).toBe(`${r.nodeId}.independent_practice`);
    }
  });

  it('projectActivityMap emits one row per child skill for a 3-skill concept (FR-13)', () => {
    // 3-skill concept, 1 spec → 3 rows (one per child skill). The full
    // unit-circle-trig fixture (sin, cos, tan) covers all 3.
    const blueprint: KnowledgeBlueprint = {
      nodeId: conceptNode.id,
      sourceNodeIds: [],
      alignmentNodeIds: [],
      rendererKey: 'concept-explorer',
      workedExampleSpec: {
        prompt: 'Worked example for unit circle trig',
        givens: [],
        steps: [],
        explanation: '',
      },
      reviewStatus: 'draft',
      metadata: {},
    };
    const nodes = [conceptNode, skillA, skillB, skillC];
    const rows = projectActivityMap(nodes, conceptEdges, [blueprint]);
    expect(rows).toHaveLength(3);
    const rowNodeIds = rows.map((r) => r.nodeId).sort();
    expect(rowNodeIds).toEqual([skillA.id, skillB.id, skillC.id].sort());
    for (const r of rows) {
      expect(r.mode).toBe('worked_example');
    }
  });

  it('projectActivityMap emits zero rows for a concept with no child skills (FR-13 edge case)', () => {
    // Concept with no `contains` edges → no rows. The single-skill
    // emission that used to apply here would have produced 0 rows
    // (because selectSkill returns null and the projection fell through
    // to `blueprintNode`, which had a stableActivityId — but the
    // spec/nodeId doesn't point to a skill, so it was effectively
    // orphaned). With the all-children fix, 0 rows is the explicit
    // contract.
    const emptyConceptEdges: KnowledgeSpaceEdge[] = [];
    const blueprint: KnowledgeBlueprint = {
      nodeId: conceptNode.id,
      sourceNodeIds: [],
      alignmentNodeIds: [],
      rendererKey: 'concept-explorer',
      independentPracticeSpec: {
        variantParameters: {},
        answerSchema: { answer: {} },
        gradingRules: [],
        replayPolicy: 'any_seed',
      },
      reviewStatus: 'draft',
      metadata: {},
    };
    const nodes = [conceptNode, skillA, skillB, skillC];
    const rows = projectActivityMap(nodes, emptyConceptEdges, [blueprint]);
    expect(rows).toHaveLength(0);
  });

  it('projectActivityMap emits exactly one row for a 1-skill concept (regression guard)', () => {
    // 1-skill concept → 1 row. This is the limit case for the FR-13
    // fix; the N-row behavior must collapse to 1 row when N=1.
    const skillOnly: KnowledgeSpaceNode = {
      id: 'math.precalc.skill.unit-circle.tan-definition',
      kind: 'skill',
      title: 'Tan from unit circle',
      reviewStatus: 'approved',
      metadata: {},
    };
    const singleConcept: KnowledgeSpaceNode = {
      id: 'math.precalc.concept.tan-only',
      kind: 'concept',
      title: 'Tan-only concept',
      reviewStatus: 'approved',
      metadata: {},
    };
    const singleEdge: KnowledgeSpaceEdge[] = [
      {
        id: 'e-solo',
        type: 'contains',
        sourceId: singleConcept.id,
        targetId: skillOnly.id,
        confidence: 'high',
        weight: 1,
        reviewStatus: 'approved',
      },
    ];
    const blueprint: KnowledgeBlueprint = {
      nodeId: singleConcept.id,
      sourceNodeIds: [],
      alignmentNodeIds: [],
      rendererKey: 'concept-explorer',
      independentPracticeSpec: {
        variantParameters: {},
        answerSchema: { answer: {} },
        gradingRules: [],
        replayPolicy: 'any_seed',
      },
      reviewStatus: 'draft',
      metadata: {},
    };
    const nodes = [singleConcept, skillOnly];
    const rows = projectActivityMap(nodes, singleEdge, [blueprint]);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.nodeId).toBe(skillOnly.id);
  });
});

// ---------------------------------------------------------------------------
// Phase 3 Track 2 — Weighted Readiness visualization (Red)
// ---------------------------------------------------------------------------

describe('Student visualization — nearly_ready support (FR4)', () => {
  it('StudentVisualizationV1 includes a nearlyReady bucket', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;

    const learnerState: Record<string, string> = {};
    // Mark one skill node as nearly_ready
    const skillNodes = nodes.filter(
      (n) => n.kind === 'skill' || n.kind === 'task_blueprint',
    );
    if (skillNodes.length > 0) {
      learnerState[skillNodes[0].id] = 'nearly_ready';
    }

    const result = projectStudentVisualization(
      nodes,
      edges,
      learnerState as Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'>,
    );

    // The result should have a nearlyReady property
    expect(result).toHaveProperty('nearlyReady');
    expect(Array.isArray((result as Record<string, unknown>)['nearlyReady'])).toBe(true);
  });

  it('nearly_ready nodes are NOT in the ready or blocked buckets', () => {
    const nodes = syntheticMathFixture.nodes;
    const edges = syntheticMathFixture.edges;

    const skillNodes = nodes.filter(
      (n) => n.kind === 'skill' || n.kind === 'task_blueprint',
    );
    if (skillNodes.length < 2) return;

    const almostReadyId = skillNodes[0].id;
    const readyId = skillNodes[1].id;

    const learnerState: Record<string, string> = {
      [almostReadyId]: 'nearly_ready',
      [readyId]: 'ready',
    };

    const result = projectStudentVisualization(
      nodes,
      edges,
      learnerState as Record<string, 'mastered' | 'ready' | 'blocked' | 'review_due'>,
    );

    const nearlyReadyBucket = (result as Record<string, unknown>)['nearlyReady'] as Array<{ nodeId: string }> | undefined;
    if (nearlyReadyBucket) {
      const nearlyIds = nearlyReadyBucket.map((n) => n.nodeId);
      expect(nearlyIds).toContain(almostReadyId);
    }

    const readyIds = result.ready.map((n) => n.nodeId);
    const blockedIds = result.blocked.map((n) => n.nodeId);

    // nearly_ready node should not leak into ready or blocked
    if (nearlyReadyBucket) {
      expect(readyIds).not.toContain(almostReadyId);
      expect(blockedIds).not.toContain(almostReadyId);
    }
  });

  it('VisualNodeV1 state accepts nearly_ready', () => {
    // The 'state' field of VisualNodeV1 should accept 'nearly_ready'
    const node: import('../projections/types.js').VisualNodeV1 = {
      nodeId: 'test.node',
      title: 'Test Node',
      state: 'nearly_ready',
    };
    expect(node.state).toBe('nearly_ready');
  });
});

describe('studentVisualizationV1Schema — nearly_ready support (FR4)', () => {
  it('studentVisualizationV1Schema validates a payload with nearlyReady bucket', () => {
    const payload = {
      schemaVersion: 'v1' as const,
      mastered: [],
      ready: [],
      blocked: [],
      reviewDue: [],
      nearlyReady: [
        { nodeId: 'skill.a', title: 'Skill A', state: 'nearly_ready' as const },
      ],
      recommendedNext: [],
      edges: [],
      activeMisconceptionCount: 0,
    };

    // The schema should accept this payload
    const result = studentVisualizationV1Schema.safeParse(payload);
    expect(result.success).toBe(true);
  });
});
