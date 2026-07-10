import { describe, it, expect } from 'vitest';
import { knowledgeSpaceSchema, CORE_ID_PATTERN } from '../schemas.js';
import {
  validateKnowledgeSpace,
  getDanglingEdges,
  getDuplicateNodeIds,
  getDuplicateEdges,
  getNodesMissingRequiredAlignments,
  getIndependentPracticeNodesMissingGenerators,
  getInvalidEdgePairings,
  validateNodeMetadataWithAdapter,
  getPrerequisiteCycles,
} from '../validation.js';
import type {
  KnowledgeSpace,
  KnowledgeSpaceNode,
  KnowledgeSpaceEdge,
  DomainAdapter,
  ConfidenceLevel,
} from '../types.js';
import { syntheticMathFixture, syntheticEnglishGseFixture } from '../fixtures.js';

// ---------------------------------------------------------------------------
// Task 1.1 — Valid fixture tests
// ---------------------------------------------------------------------------

describe('contract — valid fixtures', () => {
  it('parses a minimal synthetic math-like knowledge space', () => {
    const result = knowledgeSpaceSchema.safeParse(syntheticMathFixture);
    expect(result.success, result.error?.message).toBe(true);
    if (result.success) {
      expect(result.data.nodes.length).toBeGreaterThanOrEqual(5);
      expect(result.data.edges.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('parses a synthetic English/GSE-like knowledge space', () => {
    const result = knowledgeSpaceSchema.safeParse(syntheticEnglishGseFixture);
    expect(result.success, result.error?.message).toBe(true);
    if (result.success) {
      expect(result.data.nodes.length).toBeGreaterThanOrEqual(3);
      expect(result.data.edges.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('accepts nodes of every defined kind', () => {
    const kinds: KnowledgeSpaceNode['kind'][] = [
      'domain',
      'content_group',
      'instructional_unit',
      'standard',
      'skill',
      'concept',
      'worked_example',
      'task_blueprint',
      'generator',
      'renderer',
      'misconception',
    ];

    for (const kind of kinds) {
      const space: KnowledgeSpace = {
        nodes: [{ ...syntheticMathFixture.nodes[0], kind }],
        edges: [],
      };
      const result = knowledgeSpaceSchema.safeParse(space);
      expect(result.success, `kind ${kind} should be valid`).toBe(true);
    }
  });

  it('accepts every defined edge type', () => {
    const edgeTypes: KnowledgeSpaceEdge['type'][] = [
      'contains',
      'appears_in_context',
      'aligned_to_standard',
      'prerequisite_for',
      'supports',
      'extends',
      'equivalent_to',
      'transfers_to',
      'common_misconception_with',
      'rendered_by',
      'generated_by',
      'evidenced_by',
    ];

    const baseNode: KnowledgeSpaceNode = {
      ...syntheticMathFixture.nodes[0],
    };
    const domainNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.domain', kind: 'domain' };
    const cgNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.cg', kind: 'content_group' };
    const lessonNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.lesson', kind: 'instructional_unit' };
    const skillNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.skill', kind: 'skill' };
    const conceptNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.concept', kind: 'concept' };
    const exampleNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.example', kind: 'worked_example' };
    const bpNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.blueprint', kind: 'task_blueprint' };
    const standardNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.standard', kind: 'standard' };
    const rendererNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.renderer', kind: 'renderer' };
    const generatorNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.generator', kind: 'generator' };
    const misconceptionNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.misconception', kind: 'misconception' };
    // Cross-domain skill nodes for transfers_to pairing rule (kst-srs.v2 §11.1: cross-domain)
    const mathSkillNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.math.skill', kind: 'skill', domain: 'math.im3' };
    const englishSkillNode: KnowledgeSpaceNode = { ...baseNode, id: 'test.english.skill', kind: 'skill', domain: 'english.gse' };

    const allNodes = [domainNode, cgNode, lessonNode, skillNode, conceptNode, exampleNode, bpNode, standardNode, rendererNode, generatorNode, misconceptionNode, mathSkillNode, englishSkillNode];

    // Source/target pairs satisfying endpoint rules for constrained edge types
    const edgeCases: Record<string, { source: KnowledgeSpaceNode; target: KnowledgeSpaceNode }> = {
      contains: { source: domainNode, target: cgNode },
      appears_in_context: { source: skillNode, target: lessonNode },
      aligned_to_standard: { source: skillNode, target: standardNode },
      prerequisite_for: { source: skillNode, target: conceptNode },
      supports: { source: conceptNode, target: skillNode },
      extends: { source: skillNode, target: conceptNode },
      equivalent_to: { source: skillNode, target: conceptNode },
      transfers_to: { source: mathSkillNode, target: englishSkillNode },
      common_misconception_with: { source: skillNode, target: misconceptionNode },
      rendered_by: { source: skillNode, target: rendererNode },
      generated_by: { source: skillNode, target: generatorNode },
      evidenced_by: { source: skillNode, target: exampleNode },
    };

    for (const type of edgeTypes) {
      const { source, target } = edgeCases[type];
      const space: KnowledgeSpace = {
        nodes: allNodes,
        edges: [
          {
            id: `edge.${type.replace(/_/g, '-')}`,
            type,
            sourceId: source.id,
            targetId: target.id,
            weight: 0.5,
            confidence: 'medium',
            sourceRefs: ['test'],
            reviewStatus: 'draft',
          },
        ],
      };
      const result = knowledgeSpaceSchema.safeParse(space);
      expect(result.success, `edge type ${type} should be valid`).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Task 1.2 — Structural failure tests
// ---------------------------------------------------------------------------

describe('contract — structural failures', () => {
  it('rejects duplicate node IDs', () => {
    const node: KnowledgeSpaceNode = syntheticMathFixture.nodes[0];
    const space: KnowledgeSpace = { nodes: [node, node], edges: [] };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.toLowerCase().includes('duplicate'))).toBe(true);
    }
  });

  it('rejects dangling edge source', () => {
    const space: KnowledgeSpace = {
      nodes: [syntheticMathFixture.nodes[0]],
      edges: [
        {
          ...syntheticMathFixture.edges[0],
          sourceId: 'nonexistent:node',
        },
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
  });

  it('rejects dangling edge target', () => {
    const space: KnowledgeSpace = {
      nodes: [syntheticMathFixture.nodes[0]],
      edges: [
        {
          ...syntheticMathFixture.edges[0],
          targetId: 'nonexistent:node',
        },
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
  });

  it('rejects duplicate exact edges', () => {
    const nodeA = syntheticMathFixture.nodes[0];
    const nodeB = { ...nodeA, id: 'node.b' };
    const edge: KnowledgeSpaceEdge = {
      id: 'edge.test',
      type: 'supports',
      sourceId: nodeA.id,
      targetId: nodeB.id,
      weight: 0.5,
      confidence: 'medium',
      sourceRefs: ['test'],
      reviewStatus: 'draft',
    };
    const space: KnowledgeSpace = {
      nodes: [nodeA, nodeB],
      edges: [edge, edge],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.toLowerCase().includes('duplicate'))).toBe(true);
    }
  });

  it('rejects invalid edge endpoint pairing (rendered_by must target renderer)', () => {
    // rendered_by source must be a node that can be rendered, target must be a renderer
    const skillNode: KnowledgeSpaceNode = {
      ...syntheticMathFixture.nodes[0],
      kind: 'skill',
    };
    const standardNode: KnowledgeSpaceNode = {
      ...skillNode,
      id: 'node.standard',
      kind: 'standard',
    };
    const space: KnowledgeSpace = {
      nodes: [skillNode, standardNode],
      edges: [
        {
          id: 'edge.rendered-by-wrong',
          type: 'rendered_by',
          sourceId: skillNode.id,
          targetId: standardNode.id, // target should be 'renderer', not 'standard'
          weight: 1,
          confidence: 'high',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Task 1.3 — Readiness validation tests
// ---------------------------------------------------------------------------

describe('contract — readiness validation', () => {
  it('flags skill nodes missing required standard alignment', () => {
    const skill: KnowledgeSpaceNode = {
      id: 'skill.no-standard',
      kind: 'skill',
      title: 'Untethered Skill',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
    };
    const space: KnowledgeSpace = { nodes: [skill], edges: [] };
    const issues = getNodesMissingRequiredAlignments(space);
    expect(issues.some((i) => i.nodeId === skill.id)).toBe(true);
  });

  it('does not flag skill nodes that have a standards alignment edge', () => {
    const skill: KnowledgeSpaceNode = {
      id: 'skill.with-standard',
      kind: 'skill',
      title: 'Tethered Skill',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
    };
    const standard: KnowledgeSpaceNode = {
      id: 'std.ccss.alg.rei.b.4',
      kind: 'standard',
      title: 'Solve quadratic equations',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
    };
    const space: KnowledgeSpace = {
      nodes: [skill, standard],
      edges: [
        {
          id: 'edge:align',
          type: 'aligned_to_standard',
          sourceId: skill.id,
          targetId: standard.id,
          weight: 1,
          confidence: 'high',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
      ],
    };
    const issues = getNodesMissingRequiredAlignments(space);
    expect(issues.some((i) => i.nodeId === skill.id)).toBe(false);
  });

  it('does not flag skill nodes that have a documented alignment exception', () => {
    const skill: KnowledgeSpaceNode = {
      id: 'skill.with-exception',
      kind: 'skill',
      title: 'Skill With Exception',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
      exceptions: [
        {
          type: 'alignment',
          reason: 'No applicable standard in current catalog',
          reviewer: 'test',
          date: '2026-01-01',
        },
      ],
    };
    const space: KnowledgeSpace = { nodes: [skill], edges: [] };
    const issues = getNodesMissingRequiredAlignments(space);
    expect(issues.some((i) => i.nodeId === skill.id)).toBe(false);
  });

  it('flags independentPracticeReady nodes missing generator edge', () => {
    const blueprint: KnowledgeSpaceNode = {
      id: 'blueprint.no-gen',
      kind: 'task_blueprint',
      title: 'Orphan Blueprint',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
      independentPracticeReady: true,
    };
    const space: KnowledgeSpace = { nodes: [blueprint], edges: [] };
    const issues = getIndependentPracticeNodesMissingGenerators(space);
    expect(issues.some((i) => i.nodeId === blueprint.id)).toBe(true);
  });

  it('does not flag independentPracticeReady nodes that have a generated_by edge', () => {
    const blueprint: KnowledgeSpaceNode = {
      id: 'blueprint.with-gen',
      kind: 'task_blueprint',
      title: 'Blueprint With Generator',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
      independentPracticeReady: true,
    };
    const generator: KnowledgeSpaceNode = {
      id: 'gen.quadratic',
      kind: 'generator',
      title: 'Quadratic Generator',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
    };
    const space: KnowledgeSpace = {
      nodes: [blueprint, generator],
      edges: [
        {
          id: 'edge.gen',
          type: 'generated_by',
          sourceId: blueprint.id,
          targetId: generator.id,
          weight: 1,
          confidence: 'high',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
      ],
    };
    const issues = getIndependentPracticeNodesMissingGenerators(space);
    expect(issues.some((i) => i.nodeId === blueprint.id)).toBe(false);
  });

  it('does not flag independentPracticeReady nodes with a generator exception', () => {
    const blueprint: KnowledgeSpaceNode = {
      id: 'blueprint.gen-exception',
      kind: 'task_blueprint',
      title: 'Blueprint With Gen Exception',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
      independentPracticeReady: true,
      exceptions: [
        {
          type: 'generator',
          reason: 'Uses hand-authored fixed item pool',
          reviewer: 'test',
          date: '2026-01-01',
        },
      ],
    };
    const space: KnowledgeSpace = { nodes: [blueprint], edges: [] };
    const issues = getIndependentPracticeNodesMissingGenerators(space);
    expect(issues.some((i) => i.nodeId === blueprint.id)).toBe(false);
  });

  it('allows a domain adapter to reject invalid metadata while core stays neutral', () => {
    const skillNode: KnowledgeSpaceNode = syntheticMathFixture.nodes[0];

    const mathAdapter: DomainAdapter = {
      domain: 'math.test',
      validateNodeMetadata: (node: KnowledgeSpaceNode) => {
        // Math adapter rejects nodes without a course/module reference
        if (!node.metadata?.course) {
          return { valid: false, errors: ['math node must have course metadata'] };
        }
        return { valid: true };
      },
    };

    // This node has no course metadata — adapter should reject
    const result = validateNodeMetadataWithAdapter(skillNode, mathAdapter);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('math node must have course metadata');
  });

  it('allows a domain adapter to accept valid domain metadata', () => {
    const skillNode: KnowledgeSpaceNode = {
      ...syntheticMathFixture.nodes[0],
      metadata: { course: 'im3', module: 'm1' },
    };

    const mathAdapter: DomainAdapter = {
      domain: 'math.test',
      validateNodeMetadata: (node: KnowledgeSpaceNode) => {
        if (!node.metadata?.course) {
          return { valid: false, errors: ['math node must have course metadata'] };
        }
        return { valid: true };
      },
    };

    const result = validateNodeMetadataWithAdapter(skillNode, mathAdapter);
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// validateKnowledgeSpace — aggregate validation
// ---------------------------------------------------------------------------

describe('validateKnowledgeSpace', () => {
  it('returns no errors for a valid graph', () => {
    const result = validateKnowledgeSpace(syntheticMathFixture);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it('returns all violation categories for an invalid graph', () => {
    const node: KnowledgeSpaceNode = syntheticMathFixture.nodes[0];
    const badSpace: KnowledgeSpace = {
      nodes: [node, { ...node, id: node.id }], // duplicate
      edges: [
        {
          id: 'edge.dangling',
          type: 'supports',
          sourceId: 'nonexistent.source',
          targetId: node.id,
          weight: 0.5,
          confidence: 'medium',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
      ],
    };
    const result = validateKnowledgeSpace(badSpace);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// Helper validators — edge cases
// ---------------------------------------------------------------------------

describe('validateKnowledgeSpace — edge cases', () => {
  it('returns errors for nodes that require alignment but lack it', () => {
    const skill: KnowledgeSpaceNode = {
      id: 'skill.alone',
      kind: 'skill',
      title: 'Lone Skill',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
    };
    const space: KnowledgeSpace = { nodes: [skill], edges: [] };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_REQUIRED_ALIGNMENT')).toBe(true);
  });

  it('returns errors for independentPracticeReady nodes missing generators', () => {
    const blueprint: KnowledgeSpaceNode = {
      id: 'bp.no-gen',
      kind: 'task_blueprint',
      title: 'No Generator',
      domain: 'math.test',
      sourceRefs: ['synthetic'],
      reviewStatus: 'draft',
      metadata: {},
      independentPracticeReady: true,
    };
    const space: KnowledgeSpace = { nodes: [blueprint], edges: [] };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.code === 'MISSING_GENERATOR')).toBe(true);
  });

  it('getDanglingEdges finds dangling source and target', () => {
    const node: KnowledgeSpaceNode = syntheticMathFixture.nodes[0];
    const graph: KnowledgeSpace = {
      nodes: [node],
      edges: [
        {
          id: 'edge.no-source',
          type: 'supports',
          sourceId: 'gone.source',
          targetId: node.id,
          weight: 0.5,
          confidence: 'medium',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
        {
          id: 'edge.no-target',
          type: 'supports',
          sourceId: node.id,
          targetId: 'gone.target',
          weight: 0.5,
          confidence: 'medium',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
      ],
    };
    const dangling = getDanglingEdges(graph);
    expect(dangling).toHaveLength(2);
  });

  it('getDuplicateNodeIds returns duplicate IDs', () => {
    const node: KnowledgeSpaceNode = syntheticMathFixture.nodes[0];
    const graph: KnowledgeSpace = { nodes: [node, node], edges: [] };
    const dups = getDuplicateNodeIds(graph);
    expect(dups).toHaveLength(1);
    expect(dups[0]).toBe(node.id);
  });

  it('getDuplicateEdges returns duplicate edge signatures', () => {
    const nodeA = syntheticMathFixture.nodes[0];
    const nodeB = { ...nodeA, id: 'node.b' };
    const edge: KnowledgeSpaceEdge = {
      id: 'edge.dup',
      type: 'supports',
      sourceId: nodeA.id,
      targetId: nodeB.id,
      weight: 0.5,
      confidence: 'medium',
      sourceRefs: ['test'],
      reviewStatus: 'draft',
    };
    const graph: KnowledgeSpace = {
      nodes: [nodeA, nodeB],
      edges: [edge, { ...edge, id: 'edge.dup2' }],
    };
    const dups = getDuplicateEdges(graph);
    expect(dups.length).toBeGreaterThan(0);
  });

  it('getInvalidEdgePairings catches endpoint violations', () => {
    const skill = syntheticMathFixture.nodes.find((n) => n.kind === 'skill')!;
    const standard = syntheticMathFixture.nodes.find((n) => n.kind === 'standard')!;
    const graph: KnowledgeSpace = {
      nodes: [skill, standard],
      edges: [
        {
          id: 'edge.pairing-violation',
          type: 'rendered_by', // must target renderer, not standard
          sourceId: skill.id,
          targetId: standard.id,
          weight: 1,
          confidence: 'high',
          sourceRefs: ['test'],
          reviewStatus: 'draft',
        },
      ],
    };
    const violations = getInvalidEdgePairings(graph);
    expect(violations.length).toBe(1);
    expect(violations[0].message).toMatch(/rendered_by/);
  });
});

// ---------------------------------------------------------------------------
// ID pattern validation
// ---------------------------------------------------------------------------

describe('contract — ID pattern validation', () => {
  it('CORE_ID_PATTERN accepts well-formed IDs', () => {
    const valid = [
      'math.im3.domain',
      'math.im3.skill.m1.l2.solve-quadratic-by-factoring',
      'english.gse.skill.b1.reading.identify-main-idea.short-text',
      'math.im3.standard.ccss.hsa.rei.b.4b',
      'math.im3.edge.prereq-roots',
    ];
    for (const id of valid) {
      expect(CORE_ID_PATTERN.test(id), `expected "${id}" to be valid`).toBe(true);
    }
  });

  it('CORE_ID_PATTERN rejects malformed IDs', () => {
    const invalid = [
      'UPPERCASE.segments',        // uppercase
      'single-segment',            // no dot — only one segment
      '-starts-with-hyphen.node',  // hyphen at start
      'has spaces.node',           // spaces
      'has_underscores.node',      // underscores
      '',                          // empty
    ];
    for (const id of invalid) {
      expect(CORE_ID_PATTERN.test(id), `expected "${id}" to be invalid`).toBe(false);
    }
  });

  it('schema rejects nodes with IDs that violate the core pattern', () => {
    const space: KnowledgeSpace = {
      nodes: [{ ...syntheticMathFixture.nodes[0], id: 'INVALID ID WITH SPACES' }],
      edges: [],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Derived provenance
// ---------------------------------------------------------------------------

describe('contract — derived provenance', () => {
  it('accepts a node with derived:true and a derivationMethod instead of sourceRefs', () => {
    const space: KnowledgeSpace = {
      nodes: [
        {
          id: 'math.im3.skill.derived-skill',
          kind: 'skill',
          title: 'Algorithmically derived skill',
          domain: 'math.im3',
          derived: true,
          derivationMethod: 'co-occurrence extraction from lesson transcripts v1',
          reviewStatus: 'draft',
          metadata: {},
        },
      ],
      edges: [],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success, result.error?.message).toBe(true);
  });

  it('rejects a node with neither sourceRefs nor derived', () => {
    const space = {
      nodes: [
        {
          id: 'math.im3.skill.no-provenance',
          kind: 'skill',
          title: 'No provenance',
          domain: 'math.im3',
          reviewStatus: 'draft',
          metadata: {},
        },
      ],
      edges: [],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.message.includes('sourceRef'))).toBe(true);
    }
  });

  it('accepts a derived edge with derivationMethod instead of sourceRefs', () => {
    const nodeA = syntheticMathFixture.nodes[0];
    const nodeB = syntheticMathFixture.nodes[1];
    const space: KnowledgeSpace = {
      nodes: [nodeA, nodeB],
      edges: [
        {
          id: 'math.im3.edge.derived-prereq',
          type: 'prerequisite_for',
          sourceId: nodeA.id,
          targetId: nodeB.id,
          weight: 0.7,
          confidence: 'low',
          derived: true,
          derivationMethod: 'co-occurrence in lesson sequence analysis',
          reviewStatus: 'draft',
        },
      ],
    };
    const result = knowledgeSpaceSchema.safeParse(space);
    expect(result.success, result.error?.message).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Task 1.1 — Prerequisite cycle detection
// ---------------------------------------------------------------------------

describe('getPrerequisiteCycles', () => {
  const makeNode = (id: string, kind: KnowledgeSpaceNode['kind'] = 'skill'): KnowledgeSpaceNode => ({
    id,
    kind,
    title: id,
    domain: 'math.im3',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
    metadata: {},
  });

  const makeEdge = (
    id: string,
    sourceId: string,
    targetId: string,
    type: KnowledgeSpaceEdge['type'] = 'prerequisite_for',
    confidence: ConfidenceLevel = 'high',
  ): KnowledgeSpaceEdge => ({
    id,
    type,
    sourceId,
    targetId,
    weight: 0.8,
    confidence,
    sourceRefs: ['test'],
    reviewStatus: 'draft',
  });

  it('returns empty array for a DAG with no cycles', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const c = makeNode('c');
    const graph: KnowledgeSpace = {
      nodes: [a, b, c],
      edges: [
        makeEdge('e1', 'a', 'b'),
        makeEdge('e2', 'b', 'c'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles).toEqual([]);
  });

  it('detects a simple high-confidence cycle of two nodes', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makeEdge('e1', 'a', 'b', 'prerequisite_for', 'high'),
        makeEdge('e2', 'b', 'a', 'prerequisite_for', 'high'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
    const cycleIds = cycles.map((c) => c.cycle.sort().join('→'));
    expect(cycleIds.some((id) => id.includes('a') && id.includes('b'))).toBe(true);
  });

  it('detects a longer high-confidence cycle', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const c = makeNode('c');
    const graph: KnowledgeSpace = {
      nodes: [a, b, c],
      edges: [
        makeEdge('e1', 'a', 'b', 'prerequisite_for', 'high'),
        makeEdge('e2', 'b', 'c', 'prerequisite_for', 'high'),
        makeEdge('e3', 'c', 'a', 'prerequisite_for', 'high'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('ignores low-confidence cycles by default', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makeEdge('e1', 'a', 'b', 'prerequisite_for', 'low'),
        makeEdge('e2', 'b', 'a', 'prerequisite_for', 'low'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles).toEqual([]);
  });

  it('detects mixed-confidence cycles including low-confidence when includeLowConfidence is true', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makeEdge('e1', 'a', 'b', 'prerequisite_for', 'low'),
        makeEdge('e2', 'b', 'a', 'prerequisite_for', 'low'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph, { includeLowConfidence: true });
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('detects cycles involving medium-confidence edges', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makeEdge('e1', 'a', 'b', 'prerequisite_for', 'medium'),
        makeEdge('e2', 'b', 'a', 'prerequisite_for', 'medium'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
  });

  it('ignores non-prerequisite edge types', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makeEdge('e1', 'a', 'b', 'supports', 'high'),
        makeEdge('e2', 'b', 'a', 'supports', 'high'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles).toEqual([]);
  });

  it('reports cycle edge IDs', () => {
    const a = makeNode('a');
    const b = makeNode('b');
    const graph: KnowledgeSpace = {
      nodes: [a, b],
      edges: [
        makeEdge('edge.ab', 'a', 'b', 'prerequisite_for', 'high'),
        makeEdge('edge.ba', 'b', 'a', 'prerequisite_for', 'high'),
      ],
    };
    const cycles = getPrerequisiteCycles(graph);
    expect(cycles.length).toBeGreaterThan(0);
    expect(cycles[0].edgeIds.length).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// Task 1.2 — Edge type endpoint validation (extended source rules)
// ---------------------------------------------------------------------------

describe('validateKnowledgeSpace — extended endpoint pairing rules', () => {
  const makeNode = (id: string, kind: KnowledgeSpaceNode['kind']): KnowledgeSpaceNode => ({
    id,
    kind,
    title: id,
    domain: 'math.im3',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
    metadata: {},
  });

  const makeAlignedSkill = (id: string): KnowledgeSpaceNode => ({
    id,
    kind: 'skill',
    title: id,
    domain: 'math.im3',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
    metadata: {},
  });

  const makeEdge = (
    id: string,
    type: KnowledgeSpaceEdge['type'],
    sourceId: string,
    targetId: string,
  ): KnowledgeSpaceEdge => ({
    id,
    type,
    sourceId,
    targetId,
    weight: 1,
    confidence: 'high',
    sourceRefs: ['test'],
    reviewStatus: 'draft',
  });

  const standardNode = makeNode('math.im3.standard.ccss.test', 'standard');

  const alignSkill = (skill: KnowledgeSpaceNode): KnowledgeSpaceEdge =>
    makeEdge(`e.align.${skill.id}`, 'aligned_to_standard', skill.id, standardNode.id);

  it('rejects contains edge where source is a skill (not a container)', () => {
    const skill = makeNode('math.im3.skill.test', 'skill');
    const lesson = makeNode('math.im3.lesson.1', 'instructional_unit');
    const space: KnowledgeSpace = {
      nodes: [skill, lesson],
      edges: [
        makeEdge('e.contains-invalid', 'contains', skill.id, lesson.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (e) => e.code === 'INVALID_EDGE_PAIRING' && e.message.includes('contains'),
    )).toBe(true);
  });

  it('accepts contains edge where source is domain and target is content_group', () => {
    const domain = makeNode('math.im3', 'domain');
    const cg = makeNode('math.im3.module.1', 'content_group');
    const lesson = makeNode('math.im3.lesson.1.1', 'instructional_unit');
    const space: KnowledgeSpace = {
      nodes: [domain, cg, lesson],
      edges: [
        makeEdge('e.contains1', 'contains', domain.id, cg.id),
        makeEdge('e.contains2', 'contains', cg.id, lesson.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(true);
  });

  it('accepts contains edge where source is instructional_unit and target is worked_example', () => {
    const lesson = makeNode('math.im3.lesson.1.1', 'instructional_unit');
    const example = makeNode('math.im3.example.1.1.1', 'worked_example');
    const standard = makeNode('math.im3.standard.ccss.test', 'standard');
    const space: KnowledgeSpace = {
      nodes: [lesson, example, standard],
      edges: [
        makeEdge('e.contains-ex', 'contains', lesson.id, example.id),
        makeEdge('e.align-ex', 'aligned_to_standard', example.id, standard.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(true);
  });

  it('accepts contains edge where source is lesson and target is skill', () => {
    const lesson = makeNode('math.im3.lesson.1.1', 'instructional_unit');
    const skill = makeAlignedSkill('math.im3.skill.1.1.test');
    const space: KnowledgeSpace = {
      nodes: [lesson, skill, standardNode],
      edges: [
        makeEdge('e.contains-skill', 'contains', lesson.id, skill.id),
        alignSkill(skill),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(true);
  });

  it('accepts rendered_by edge where source is a worked_example', () => {
    const example = makeNode('math.im3.example.1.1.1', 'worked_example');
    const renderer = makeNode('math.im3.renderer.step-by-step-solver', 'renderer');
    const standard = makeNode('math.im3.standard.ccss.test', 'standard');
    const space: KnowledgeSpace = {
      nodes: [example, renderer, standard],
      edges: [
        makeEdge('e.rendered-ex', 'rendered_by', example.id, renderer.id),
        makeEdge('e.align-ex', 'aligned_to_standard', example.id, standard.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(true);
  });

  it('rejects rendered_by edge where source is a standard', () => {
    const standard = makeNode('math.im3.standard.ccss.hsa.rei.b.4', 'standard');
    const renderer = makeNode('math.im3.renderer.step-by-step-solver', 'renderer');
    const space: KnowledgeSpace = {
      nodes: [standard, renderer],
      edges: [
        makeEdge('e.rendered-std', 'rendered_by', standard.id, renderer.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (e) => e.code === 'INVALID_EDGE_PAIRING' && e.message.includes('rendered_by'),
    )).toBe(true);
  });

  it('rejects generated_by edge where source is a worked_example (only skill/task_blueprint allowed)', () => {
    const example = makeNode('math.im3.example.1.1.1', 'worked_example');
    const generator = makeNode('math.im3.generator.quadratic-factoring', 'generator');
    const space: KnowledgeSpace = {
      nodes: [example, generator],
      edges: [
        makeEdge('e.gen-example', 'generated_by', example.id, generator.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (e) => e.code === 'INVALID_EDGE_PAIRING' && e.message.includes('generated_by'),
    )).toBe(true);
  });

  it('accepts generated_by edge where source is a skill', () => {
    const skill = makeAlignedSkill('math.im3.skill.1.4.solve-quadratic-by-factoring');
    const generator = makeNode('math.im3.generator.quadratic-factoring', 'generator');
    const space: KnowledgeSpace = {
      nodes: [skill, generator, standardNode],
      edges: [
        makeEdge('e.gen-skill', 'generated_by', skill.id, generator.id),
        alignSkill(skill),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(true);
  });

  it('rejects aligned_to_standard edge where source is a domain', () => {
    const domain = makeNode('math.im3', 'domain');
    const standard = makeNode('math.im3.standard.ccss.hsa.rei.b.4', 'standard');
    const space: KnowledgeSpace = {
      nodes: [domain, standard],
      edges: [
        makeEdge('e.align-domain', 'aligned_to_standard', domain.id, standard.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (e) => e.code === 'INVALID_EDGE_PAIRING' && e.message.includes('aligned_to_standard'),
    )).toBe(true);
  });

  it('accepts aligned_to_standard edge from worked_example to standard', () => {
    const example = makeNode('math.im3.example.1.1.1', 'worked_example');
    const standard = makeNode('math.im3.standard.ccss.hsa.rei.b.4', 'standard');
    const space: KnowledgeSpace = {
      nodes: [example, standard],
      edges: [
        makeEdge('e.align-ex', 'aligned_to_standard', example.id, standard.id),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(true);
  });

  it('rejects common_misconception_with edge where target is not misconception', () => {
    const skill = makeAlignedSkill('math.im3.skill.1.4.solve-quadratic-by-factoring');
    const other = makeAlignedSkill('math.im3.skill.1.4.test');
    const space: KnowledgeSpace = {
      nodes: [skill, other, standardNode],
      edges: [
        makeEdge('e.miscon-wrong', 'common_misconception_with', skill.id, other.id),
        alignSkill(skill),
        alignSkill(other),
      ],
    };
    const result = validateKnowledgeSpace(space);
    expect(result.valid).toBe(false);
    expect(result.errors.some(
      (e) => e.code === 'INVALID_EDGE_PAIRING' && e.message.includes('common_misconception_with'),
    )).toBe(true);
  });
});
