// Zod schemas for knowledge-space.v1

import { z } from 'zod';
import type {
  KnowledgeSpaceNode,
  KnowledgeSpaceEdge,
} from './types.js';

import { EDGE_ENDPOINT_RULES } from './edge-endpoint-rules.js';

// Stable ID pattern: lower-kebab-case segments separated by dots, minimum two segments.
// First segment must start with a letter; subsequent segments may start with a letter or digit.
// Examples: "math.im3.skill.m1.l2.solve-quadratic", "english.gse.domain"
export const CORE_ID_PATTERN = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/;

const nodeKindSchema = z.enum([
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
]);

const edgeTypeSchema = z.enum([
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
  'remediated_by',
]);

const confidenceSchema = z.enum(['low', 'medium', 'high']);

const reviewStatusSchema = z.enum(['draft', 'reviewed', 'approved', 'rejected']);

const exceptionTypeSchema = z.enum(['alignment', 'generator', 'source', 'other']);

export const sourceRefSchema = z.object({
  source: z.string().min(1),
  location: z.string().optional(),
  url: z.string().optional(),
  note: z.string().optional(),
});

export const sourceRefsSchema = z.array(
  z.union([z.string().min(1), sourceRefSchema]),
).min(1, 'Every node and edge must cite at least one source reference');

export const exceptionSchema = z.object({
  type: exceptionTypeSchema,
  reason: z.string().min(1),
  reviewer: z.string().optional(),
  date: z.string().optional(),
});

export const knowledgeSpaceNodeSchema = z.object({
  id: z.string().regex(
    CORE_ID_PATTERN,
    'Node ID must be dot-separated lower-kebab-case segments, e.g. "math.im3.skill.m1.solve-x"',
  ),
  kind: nodeKindSchema,
  title: z.string().min(1),
  domain: z.string().min(1),
  description: z.string().optional(),
  sourceRefs: sourceRefsSchema.optional(),
  derived: z.boolean().optional(),
  derivationMethod: z.string().min(1).optional(),
  reviewStatus: reviewStatusSchema,
  metadata: z.record(z.string(), z.unknown()),
  difficulty: z.number().min(0).max(1).optional(),
  alignmentRefs: z.array(z.string()).optional(),
  rendererKey: z.string().optional(),
  generatorKey: z.string().optional(),
  independentPracticeReady: z.boolean().optional(),
  exceptions: z.array(exceptionSchema).optional(),
}).superRefine((data, ctx) => {
  const hasSourceRefs = Array.isArray(data.sourceRefs) && data.sourceRefs.length > 0;
  const hasDerived = data.derived === true && typeof data.derivationMethod === 'string';
  if (!hasSourceRefs && !hasDerived) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Node must have at least one sourceRef, or set derived:true with a derivationMethod',
    });
  }
});

export const knowledgeSpaceEdgeSchema = z.object({
  id: z.string().regex(
    CORE_ID_PATTERN,
    'Edge ID must be dot-separated lower-kebab-case segments, e.g. "math.im3.edge.prereq-roots"',
  ),
  type: edgeTypeSchema,
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  weight: z.number().min(0).max(1),
  confidence: confidenceSchema,
  sourceRefs: sourceRefsSchema.optional(),
  derived: z.boolean().optional(),
  derivationMethod: z.string().min(1).optional(),
  reviewStatus: reviewStatusSchema,
  rationale: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
}).superRefine((data, ctx) => {
  const hasSourceRefs = Array.isArray(data.sourceRefs) && data.sourceRefs.length > 0;
  const hasDerived = data.derived === true && typeof data.derivationMethod === 'string';
  if (!hasSourceRefs && !hasDerived) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Edge must have at least one sourceRef, or set derived:true with a derivationMethod',
    });
  }
});

// ---------------------------------------------------------------------------
// Node ID uniqueness constraint
// ---------------------------------------------------------------------------

/**
 * Check for duplicate node IDs and add a Zod issue if found.
 * @param {KnowledgeSpaceNode[]} nodes - Array of knowledge space nodes
 * @param {z.RefinementCtx} ctx - Zod refinement context for reporting issues
 */
function checkDuplicateNodeIds(
  nodes: KnowledgeSpaceNode[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Map<string, number>();
  for (let i = 0; i < nodes.length; i++) {
    const count = seen.get(nodes[i].id) ?? 0;
    if (count > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate node ID "${nodes[i].id}" — node IDs must be unique`,
        path: ['nodes', i, 'id'],
      });
      return; // stop at first duplicate
    }
    seen.set(nodes[i].id, count + 1);
  }
}

// ---------------------------------------------------------------------------
// Dangling edge detection
// ---------------------------------------------------------------------------

/**
 * Check for edges referencing non-existent nodes and add a Zod issue if found.
 * @param {KnowledgeSpaceNode[]} nodes - Array of knowledge space nodes
 * @param {KnowledgeSpaceEdge[]} edges - Array of knowledge space edges
 * @param {z.RefinementCtx} ctx - Zod refinement context for reporting issues
 */
function checkDanglingEdges(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
  ctx: z.RefinementCtx,
): void {
  const nodeIds = new Set(nodes.map((n) => n.id));
  for (let i = 0; i < edges.length; i++) {
    if (!nodeIds.has(edges[i].sourceId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Dangling edge source "${edges[i].sourceId}" references a node that does not exist`,
        path: ['edges', i, 'sourceId'],
      });
      return;
    }
    if (!nodeIds.has(edges[i].targetId)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Dangling edge target "${edges[i].targetId}" references a node that does not exist`,
        path: ['edges', i, 'targetId'],
      });
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Duplicate exact edge detection (same sourceId, targetId, type)
// ---------------------------------------------------------------------------

/**
 * Check for duplicate edges (same sourceId, targetId, and type) and add a Zod issue if found.
 * @param {KnowledgeSpaceEdge[]} edges - Array of knowledge space edges
 * @param {z.RefinementCtx} ctx - Zod refinement context for reporting issues
 */
function checkDuplicateEdges(
  edges: KnowledgeSpaceEdge[],
  ctx: z.RefinementCtx,
): void {
  const seen = new Map<string, number>();
  for (let i = 0; i < edges.length; i++) {
    const key = `${edges[i].sourceId}::${edges[i].targetId}::${edges[i].type}`;
    const count = seen.get(key) ?? 0;
    if (count > 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Duplicate edge (${edges[i].sourceId} → ${edges[i].targetId} [${edges[i].type}])`,
        path: ['edges', i],
      });
      return;
    }
    seen.set(key, count + 1);
  }
}

// ---------------------------------------------------------------------------
// Edge endpoint pairing validation
// ---------------------------------------------------------------------------

/**
 * Check edges against endpoint pairing rules and add a Zod issue for violations.
 * @param {KnowledgeSpaceNode[]} nodes - Array of knowledge space nodes
 * @param {KnowledgeSpaceEdge[]} edges - Array of knowledge space edges
 * @param {z.RefinementCtx} ctx - Zod refinement context for reporting issues
 */
function checkEndpointPairings(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
  ctx: z.RefinementCtx,
): void {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const rulesByType = new Map(
    EDGE_ENDPOINT_RULES.map((r) => [r.edgeType, r] as const),
  );

  for (let i = 0; i < edges.length; i++) {
    const edge = edges[i];
    const rule = rulesByType.get(edge.type);
    if (!rule) continue;

    const targetNode = nodeMap.get(edge.targetId);
    if (targetNode && rule.targetKinds.length > 0 && !rule.targetKinds.includes(targetNode.kind)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge "${edge.id}" of type "${edge.type}" must target a node of kind ${rule.targetKinds.join(' | ')}, but targets "${targetNode.kind}"`,
        path: ['edges', i],
      });
      return;
    }

    const sourceNode = nodeMap.get(edge.sourceId);
    if (sourceNode && rule.sourceKinds && rule.sourceKinds.length > 0 && !rule.sourceKinds.includes(sourceNode.kind)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge "${edge.id}" of type "${edge.type}" must originate from a node of kind ${rule.sourceKinds.join(' | ')}, but originates from "${sourceNode.kind}"`,
        path: ['edges', i],
      });
      return;
    }

    if (rule.crossDomainOnly && sourceNode && targetNode && sourceNode.domain === targetNode.domain) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Edge "${edge.id}" of type "${edge.type}" must connect nodes in different domains, but both are in "${sourceNode.domain}"`,
        path: ['edges', i],
      });
      return;
    }
  }
}

// ---------------------------------------------------------------------------
// Full knowledge space schema
// ---------------------------------------------------------------------------

export const knowledgeSpaceSchema = z.object({
  nodes: z.array(knowledgeSpaceNodeSchema).min(1, 'Knowledge space must have at least one node'),
  edges: z.array(knowledgeSpaceEdgeSchema).default([]),
}).superRefine((data, ctx) => {
  const { nodes, edges } = data as { nodes: KnowledgeSpaceNode[]; edges: KnowledgeSpaceEdge[] };

  checkDuplicateNodeIds(nodes, ctx);
  checkDanglingEdges(nodes, edges, ctx);
  checkDuplicateEdges(edges, ctx);
  checkEndpointPairings(nodes, edges, ctx);
});
