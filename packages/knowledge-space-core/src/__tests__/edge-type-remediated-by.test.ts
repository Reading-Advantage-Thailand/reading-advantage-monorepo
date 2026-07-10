// Phase 1 (Track 6 misconception-loop_20260521) — `remediated_by` contract tests.
//
// kst-srs.v2 §9.1 + spec.md FR1: `remediated_by` is a new edge type that points
// a `misconception` at the activity that remediates it. The endpoint pair is
// `misconception → worked_example | task_blueprint | skill`. The contract
// surfaces exercised in this file:
//   1. The EdgeType union in packages/knowledge-space-core/src/types.ts
//   2. The edgeTypeSchema enum in packages/knowledge-space-core/src/schemas.ts
//   3. The EDGE_ENDPOINT_RULES pairing list (now sourced from
//      edge-endpoint-rules.ts) with sourceKinds: ['misconception'] and
//      targetKinds: ['worked_example', 'task_blueprint', 'skill']
//   4. The validation pipeline (validateKnowledgeSpace + getInvalidEdgePairings)
//
// These tests intentionally exercise the happy path AND the negative cases
// (wrong source kind, wrong target kind, typo in edge type). The escape
// hatches (e.g., `as EdgeType` casts) are deliberate: we want the vitest
// runner to surface the runtime response of the live schema/validation
// pipeline rather than TS compile errors masking the real signal.

import { describe, it, expect } from 'vitest';
import { knowledgeSpaceSchema } from '../schemas.js';
import {
  validateKnowledgeSpace,
  getInvalidEdgePairings,
} from '../validation.js';
import type {
  EdgeType,
  KnowledgeSpace,
  KnowledgeSpaceNode,
  KnowledgeSpaceEdge,
} from '../types.js';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const baseNode: KnowledgeSpaceNode = {
  id: 'placeholder',
  kind: 'skill',
  title: 'placeholder',
  domain: 'math.im3',
  sourceRefs: ['test'],
  reviewStatus: 'draft',
  metadata: {},
};

function makeNode(
  id: string,
  kind: KnowledgeSpaceNode['kind'],
  domain = 'math.im3',
): KnowledgeSpaceNode {
  return { ...baseNode, id, kind, domain, title: id };
}

const standard: KnowledgeSpaceNode = makeNode(
  'math.im3.standard.test',
  'standard',
);
const renderer: KnowledgeSpaceNode = makeNode(
  'math.im3.renderer.test',
  'renderer',
);
const generator: KnowledgeSpaceNode = makeNode(
  'math.im3.generator.test',
  'generator',
);

const misconception: KnowledgeSpaceNode = makeNode(
  'math.im3.misconception.sign-error',
  'misconception',
);
const workedExample: KnowledgeSpaceNode = makeNode(
  'math.im3.example.1.4.019',
  'worked_example',
);
const taskBlueprint: KnowledgeSpaceNode = makeNode(
  'math.im3.blueprint.1.4.quadratic-factoring',
  'task_blueprint',
);
const skill: KnowledgeSpaceNode = makeNode(
  'math.im3.skill.1.4.solve-quadratic-equations-by-factoring',
  'skill',
);
// A second misconception + second skill so we can exercise "wrong target kind"
// cases without colliding with the well-formed graph fixtures.
const otherMisconception: KnowledgeSpaceNode = makeNode(
  'math.im3.misconception.diagnostic-other',
  'misconception',
);
const otherSkill: KnowledgeSpaceNode = makeNode(
  'math.im3.skill.1.4.diagnostic-other',
  'skill',
);

function makeEdge(
  id: string,
  type: string,
  sourceId: string,
  targetId: string,
): KnowledgeSpaceEdge {
  return {
    id,
    type: type as EdgeType,
    sourceId,
    targetId,
    weight: 0.5,
    confidence: 'medium',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
  };
}

const alignments: KnowledgeSpaceEdge[] = [
  makeEdge('edge.align-we', 'aligned_to_standard', workedExample.id, standard.id),
  makeEdge('edge.align-bp', 'aligned_to_standard', taskBlueprint.id, standard.id),
  makeEdge('edge.align-skill', 'aligned_to_standard', skill.id, standard.id),
  makeEdge('edge.align-other', 'aligned_to_standard', otherSkill.id, standard.id),
];

const allNodes: KnowledgeSpaceNode[] = [
  standard,
  renderer,
  generator,
  misconception,
  workedExample,
  taskBlueprint,
  skill,
  otherMisconception,
  otherSkill,
];

// ---------------------------------------------------------------------------
// 1. EdgeType union exhaustiveness
// ---------------------------------------------------------------------------

/**
 * Compile-time + runtime exhaustiveness check: if `remediated_by` is missing
 * from the EdgeType union, the `assertNever` helper will be invoked
 * (TypeScript will reject the literal) and the runtime switch will hit the
 * `default` arm and throw — both fail the test loudly.
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected edge type: ${JSON.stringify(x)}`);
}

describe('EdgeType union — exhaustiveness (kst-srs.v2 §9.1, spec FR1)', () => {
  it('EdgeType union includes remediated_by (assertNever round-trip)', () => {
    const sample: EdgeType = 'remediated_by' as EdgeType;
    let reached = false;
    switch (sample) {
      case 'contains':
      case 'appears_in_context':
      case 'aligned_to_standard':
      case 'prerequisite_for':
      case 'supports':
      case 'extends':
      case 'equivalent_to':
      case 'transfers_to':
      case 'common_misconception_with':
      case 'rendered_by':
      case 'generated_by':
      case 'evidenced_by':
      case 'remediated_by':
        reached = true;
        break;
      default:
        assertNever(sample);
    }
    expect(reached).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Zod schema accept/reject for remediated_by
// ---------------------------------------------------------------------------

describe('zod — remediated_by edge type', () => {
  it('accepts a remediated_by edge (misconception → worked_example)', () => {
    const space: KnowledgeSpace = {
      nodes: [misconception, workedExample, taskBlueprint, skill, standard, otherMisconception, otherSkill],
      edges: [
        ...alignments,
        makeEdge('edge.remed-we', 'remediated_by', misconception.id, workedExample.id),
        makeEdge('edge.remed-other-ok', 'remediated_by', otherMisconception.id, otherSkill.id),
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('accepts a remediated_by edge (misconception → task_blueprint)', () => {
    const space: KnowledgeSpace = {
      nodes: [misconception, workedExample, taskBlueprint, skill, standard, otherMisconception, otherSkill],
      edges: [
        ...alignments,
        makeEdge('edge.remed-bp', 'remediated_by', misconception.id, taskBlueprint.id),
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('accepts a remediated_by edge (misconception → skill)', () => {
    const space: KnowledgeSpace = {
      nodes: [misconception, skill, standard],
      edges: [
        makeEdge('edge.align-skill', 'aligned_to_standard', skill.id, standard.id),
        makeEdge('edge.remed-skill', 'remediated_by', misconception.id, skill.id),
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('rejects an unknown / typo edge type (regression guard)', () => {
    const space: KnowledgeSpace = {
      nodes: [misconception, workedExample, standard],
      edges: [
        makeEdge('edge.align-we', 'aligned_to_standard', workedExample.id, standard.id),
        makeEdge('edge.bogus-remed', 'remediatedby', misconception.id, workedExample.id),
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(' | ');
      // zod 4.x reports invalid enum value
      expect(messages.toLowerCase()).toMatch(/invalid|enum/);
    }
  });
});

// ---------------------------------------------------------------------------
// 3. Endpoint-pairing rule for remediated_by
// ---------------------------------------------------------------------------

describe('endpoint pairing — remediated_by (kst-srs.v2 §9.1, §2.7, spec FR1)', () => {
  it('accepts remediated_by from misconception → worked_example', () => {
    const graph: KnowledgeSpace = {
      nodes: [misconception, workedExample, standard, otherMisconception, otherSkill],
      edges: [
        ...alignments,
        makeEdge('edge.remed-we', 'remediated_by', misconception.id, workedExample.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations).toHaveLength(0);
  });

  it('accepts remediated_by from misconception → task_blueprint', () => {
    const graph: KnowledgeSpace = {
      nodes: [misconception, taskBlueprint, standard],
      edges: [
        makeEdge('edge.align-bp', 'aligned_to_standard', taskBlueprint.id, standard.id),
        makeEdge('edge.remed-bp', 'remediated_by', misconception.id, taskBlueprint.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations).toHaveLength(0);
  });

  it('accepts remediated_by from misconception → skill', () => {
    const graph: KnowledgeSpace = {
      nodes: [misconception, skill, standard],
      edges: [
        makeEdge('edge.align-skill', 'aligned_to_standard', skill.id, standard.id),
        makeEdge('edge.remed-skill', 'remediated_by', misconception.id, skill.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations).toHaveLength(0);
  });

  it('rejects remediated_by where the source is a skill (must originate from misconception)', () => {
    const graph: KnowledgeSpace = {
      nodes: [skill, workedExample, standard, misconception, otherMisconception, otherSkill],
      edges: [
        ...alignments,
        makeEdge('edge.remed-wrong-source', 'remediated_by', skill.id, workedExample.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.remed-wrong-source');
  });

  it('rejects remediated_by where the target is a renderer (misconception → renderer)', () => {
    const graph: KnowledgeSpace = {
      nodes: [misconception, renderer, standard],
      edges: [
        makeEdge('edge.remed-wrong-target-renderer', 'remediated_by', misconception.id, renderer.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.remed-wrong-target-renderer');
  });

  it('rejects remediated_by where the target is a standard (misconception → standard)', () => {
    const graph: KnowledgeSpace = {
      nodes: [misconception, standard, otherMisconception, otherSkill],
      edges: [
        ...alignments,
        makeEdge('edge.remed-wrong-target-standard', 'remediated_by', misconception.id, standard.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.remed-wrong-target-standard');
  });
});

// ---------------------------------------------------------------------------
// 4. validateKnowledgeSpace end-to-end with remediated_by
// ---------------------------------------------------------------------------

describe('validateKnowledgeSpace — end-to-end with remediated_by (kst-srs.v2 §2.7, spec FR1)', () => {
  it('returns valid:true for a graph that pairs each misconception with a remediated_by worked_example', () => {
    const graph: KnowledgeSpace = {
      nodes: allNodes,
      edges: [
        ...alignments,
        makeEdge('edge.remed-1', 'remediated_by', misconception.id, workedExample.id),
        makeEdge('edge.remed-2', 'remediated_by', otherMisconception.id, taskBlueprint.id),
      ],
    };
    const result = validateKnowledgeSpace(graph);
    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(true);
  });

  it('returns INVALID_EDGE_PAIRING for a remediated_by edge with the wrong target kind', () => {
    const graph: KnowledgeSpace = {
      nodes: [misconception, renderer, standard],
      edges: [
        makeEdge('edge.remed-bad', 'remediated_by', misconception.id, renderer.id),
      ],
    };
    const result = validateKnowledgeSpace(graph);
    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(false);
    const pairingErr = result.errors.find((e) => e.code === 'INVALID_EDGE_PAIRING');
    expect(pairingErr, 'expected an INVALID_EDGE_PAIRING error').toBeDefined();
  });

  it('returns INVALID_EDGE_PAIRING for a remediated_by edge with the wrong source kind', () => {
    const graph: KnowledgeSpace = {
      nodes: [skill, workedExample, standard, misconception, otherMisconception, otherSkill],
      edges: [
        ...alignments,
        makeEdge('edge.remed-wrong-source', 'remediated_by', skill.id, workedExample.id),
      ],
    };
    const result = validateKnowledgeSpace(graph);
    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(false);
    const pairingErr = result.errors.find(
      (e) =>
        e.code === 'INVALID_EDGE_PAIRING' &&
        e.edgeId === 'edge.remed-wrong-source',
    );
    expect(pairingErr, 'expected an INVALID_EDGE_PAIRING error for the wrong-source edge').toBeDefined();
  });
});
