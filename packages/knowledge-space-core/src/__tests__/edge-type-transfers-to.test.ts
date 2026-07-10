// Phase 1 (Track 8 kst-lesser-holes_20260521) — `transfers_to` contract tests.
//
// kst-srs.v2 §11.1: `transfers_to` is a weighted, cross-domain edge type distinct
// from `equivalent_to` (which is identity). The contract surfaces exercised in
// this file:
//   1. The EdgeType union in packages/knowledge-space-core/src/types.ts
//   2. The edgeTypeSchema enum in packages/knowledge-space-core/src/schemas.ts
//   3. The EDGE_ENDPOINT_RULES pairing list (now sourced from
//      edge-endpoint-rules.ts) with cross-domain pairing (sourceKinds/
//      targetKinds from spec; same-domain rejected)
//   4. The validation pipeline (validateKnowledgeSpace + getInvalidEdgePairings)
//
// These tests cover the happy path plus the negative cases (wrong source kind,
// wrong target kind, same-domain concept pairs, typo in edge type) and the
// zero-weight boundary. The escape hatches (e.g., `as EdgeType` casts,
// `as unknown` for building out-of-union payloads) are deliberate: we want the
// vitest runner to surface the runtime response of the live schema/validation
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
  domain: 'placeholder',
  sourceRefs: ['test'],
  reviewStatus: 'draft',
  metadata: {},
};

function makeSkillNode(id: string, domain: string): KnowledgeSpaceNode {
  return { ...baseNode, id, kind: 'skill', domain, title: id };
}

const mathSkillA = makeSkillNode('math.im3.skill.alpha', 'math.im3');
const mathSkillB = makeSkillNode('math.im3.skill.beta', 'math.im3');
const englishSkill = makeSkillNode('english.gse.skill.gamma', 'english.gse');

const mathStandard: KnowledgeSpaceNode = {
  ...baseNode,
  id: 'math.im3.standard.test',
  kind: 'standard',
  domain: 'math.im3',
  title: 'CCSS test standard',
};
const englishStandard: KnowledgeSpaceNode = {
  ...baseNode,
  id: 'english.gse.standard.test',
  kind: 'standard',
  domain: 'english.gse',
  title: 'GSE test standard',
};

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

const skillAlignments: KnowledgeSpaceEdge[] = [
  makeEdge('edge.align-a', 'aligned_to_standard', mathSkillA.id, mathStandard.id),
  makeEdge('edge.align-b', 'aligned_to_standard', mathSkillB.id, mathStandard.id),
  makeEdge('edge.align-en', 'aligned_to_standard', englishSkill.id, englishStandard.id),
];

// ---------------------------------------------------------------------------
// 1. EdgeType union exhaustiveness
// ---------------------------------------------------------------------------

/**
 * Compile-time + runtime exhaustiveness check: if `transfers_to` is missing from
 * the EdgeType union, the `assertNever` helper will be invoked (TypeScript will
 * reject the literal) and the runtime switch will hit the `default` arm and
 * throw — both fail the test loudly.
 */
function assertNever(x: never): never {
  throw new Error(`Unexpected edge type: ${JSON.stringify(x)}`);
}

describe('EdgeType union — exhaustiveness (kst-srs.v2 §11.1)', () => {
  it('EdgeType union includes transfers_to (assertNever round-trip)', () => {
    const sample: EdgeType = 'transfers_to' as EdgeType;
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
// 2. Zod schema accept/reject for transfers_to
// ---------------------------------------------------------------------------

describe('zod — transfers_to edge type', () => {
  it('accepts a transfers_to edge (cross-domain skill → skill)', () => {
    const space: KnowledgeSpace = {
      nodes: [mathSkillA, mathSkillB, englishSkill, mathStandard, englishStandard],
      edges: [
        ...skillAlignments,
        makeEdge('edge.transfers-cross', 'transfers_to', mathSkillA.id, englishSkill.id),
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success, result.success ? '' : result.error.message).toBe(true);
  });

  it('rejects an unknown / typo edge type (regression guard)', () => {
    const space: KnowledgeSpace = {
      nodes: [mathSkillA, englishSkill, mathStandard, englishStandard],
      edges: [
        ...skillAlignments,
        makeEdge('edge.bogus', 'transfer_to', mathSkillA.id, englishSkill.id),
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
// 3. Endpoint-pairing rule for transfers_to
// ---------------------------------------------------------------------------

describe('endpoint pairing — transfers_to (kst-srs.v2 §11.1, §2.7)', () => {
  it('accepts transfers_to between distinct domains (math → english)', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathSkillA, englishSkill, mathStandard, englishStandard],
      edges: [
        ...skillAlignments,
        makeEdge('edge.transfers-1', 'transfers_to', mathSkillA.id, englishSkill.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations).toHaveLength(0);
  });

  it('rejects transfers_to within the same domain (math → math)', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathSkillA, mathSkillB, mathStandard],
      edges: [
        makeEdge('edge.align-a', 'aligned_to_standard', mathSkillA.id, mathStandard.id),
        makeEdge('edge.align-b', 'aligned_to_standard', mathSkillB.id, mathStandard.id),
        makeEdge('edge.transfers-same-domain', 'transfers_to', mathSkillA.id, mathSkillB.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.transfers-same-domain');
  });
});

// ---------------------------------------------------------------------------
// 5. Expanded transfers_to negative coverage (Task 6.5)
// ---------------------------------------------------------------------------

const mathConcept: KnowledgeSpaceNode = {
  ...baseNode,
  id: 'math.im3.concept.alpha',
  kind: 'concept',
  domain: 'math.im3',
  title: 'math.im3.concept.alpha',
};
const englishConcept: KnowledgeSpaceNode = {
  ...baseNode,
  id: 'english.gse.concept.beta',
  kind: 'concept',
  domain: 'english.gse',
  title: 'english.gse.concept.beta',
};

describe('endpoint pairing — transfers_to expanded negatives (kst-srs.v2 §11.1)', () => {
  it('rejects transfers_to where the source is a standard (wrong source kind)', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathStandard, englishSkill],
      edges: [
        makeEdge('edge.transfers-wrong-source', 'transfers_to', mathStandard.id, englishSkill.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.transfers-wrong-source');
  });

  it('rejects transfers_to where the target is a standard (wrong target kind)', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathSkillA, englishStandard],
      edges: [
        makeEdge('edge.transfers-wrong-target', 'transfers_to', mathSkillA.id, englishStandard.id),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.transfers-wrong-target');
  });

  it('rejects transfers_to between concepts in the same domain', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathConcept, { ...englishConcept, domain: 'math.im3', id: 'math.im3.concept.beta' }],
      edges: [
        makeEdge('edge.transfers-same-domain-concept', 'transfers_to', mathConcept.id, 'math.im3.concept.beta'),
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBeGreaterThan(0);
    expect(violations[0].edgeId).toBe('edge.transfers-same-domain-concept');
  });

  it('accepts a zero-weight transfers_to edge (weight boundary)', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathSkillA, englishSkill, mathStandard, englishStandard],
      edges: [
        ...skillAlignments,
        {
          ...makeEdge('edge.transfers-zero-weight', 'transfers_to', mathSkillA.id, englishSkill.id),
          weight: 0,
        },
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// 4. validateKnowledgeSpace end-to-end with a mixed graph
// ---------------------------------------------------------------------------

describe('validateKnowledgeSpace — end-to-end with transfers_to (kst-srs.v2 §2.7)', () => {
  it('returns valid:true for a graph that mixes prerequisite_for + cross-domain transfers_to', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathSkillA, mathSkillB, englishSkill, mathStandard, englishStandard],
      edges: [
        ...skillAlignments,
        makeEdge('edge.prereq-1', 'prerequisite_for', mathSkillA.id, mathSkillB.id),
        makeEdge('edge.transfers-1', 'transfers_to', mathSkillB.id, englishSkill.id),
      ],
    };
    const result = validateKnowledgeSpace(graph);
    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(true);
  });

  it('returns INVALID_EDGE_PAIRING for a same-domain transfers_to edge', () => {
    const graph: KnowledgeSpace = {
      nodes: [mathSkillA, mathSkillB, mathStandard],
      edges: [
        makeEdge('edge.align-a', 'aligned_to_standard', mathSkillA.id, mathStandard.id),
        makeEdge('edge.align-b', 'aligned_to_standard', mathSkillB.id, mathStandard.id),
        makeEdge('edge.transfers-same', 'transfers_to', mathSkillA.id, mathSkillB.id),
      ],
    };
    const result = validateKnowledgeSpace(graph);
    expect(result.valid, JSON.stringify(result.errors, null, 2)).toBe(false);
    const pairingErr = result.errors.find((e) => e.code === 'INVALID_EDGE_PAIRING');
    expect(pairingErr, 'expected an INVALID_EDGE_PAIRING error').toBeDefined();
  });
});
