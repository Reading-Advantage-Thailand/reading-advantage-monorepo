import {
  getPrerequisiteCycles,
  validateKnowledgeSpace,
  type KnowledgeSpaceEdge,
  type KnowledgeSpaceNode,
} from "@reading-advantage/knowledge-space-core";

import {
  CodeKnowledgeGraphSchema,
  type CodeKnowledgeGraph,
} from "./contracts.js";

/** One stable, actionable authoring problem returned by Codecamp graph validation. */
export interface CodeGraphIssue {
  /** Stable machine-readable issue code. */
  code: string;
  /** Human-readable correction guidance. */
  message: string;
  /** Node or edge identifier when the issue belongs to one graph entity. */
  entityId?: string;
  /** Contract path when the issue originated at a schema boundary. */
  path?: string;
}

/** Complete fail-closed result for a Codecamp graph release. */
export interface CodeGraphValidationResult {
  /** Whether the release is safe to publish. */
  valid: boolean;
  /** Deterministically ordered authoring issues. */
  issues: CodeGraphIssue[];
}

function schemaIssueCode(message: string): string {
  if (message.includes("Duplicate node ID")) return "DUPLICATE_NODE_ID";
  if (message.includes("Dangling edge")) return "DANGLING_EDGE";
  if (message.includes("Duplicate edge")) return "DUPLICATE_EDGE";
  if (message.includes("must connect nodes in different domains")) return "INVALID_EDGE_PAIRING";
  if (message.includes("must originate") || message.includes("must target")) return "INVALID_EDGE_PAIRING";
  return "SCHEMA_INVALID";
}

function containsReachableObjectives(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
): Set<string> {
  const roots = nodes.filter((node) => node.kind === "domain" && node.domain === "codecamp");
  const reachable = new Set(roots.map((node) => node.id));
  let changed = true;
  while (changed) {
    changed = false;
    for (const edge of edges) {
      if (edge.type === "contains" && reachable.has(edge.sourceId) && !reachable.has(edge.targetId)) {
        reachable.add(edge.targetId);
        changed = true;
      }
    }
  }
  return reachable;
}

function validateGate(edge: KnowledgeSpaceEdge, issues: CodeGraphIssue[]): void {
  const gate = edge.metadata?.gate;
  if (gate === "hard") {
    if (edge.type !== "prerequisite_for" || edge.weight < 0.8 || edge.confidence !== "high") {
      issues.push({
        code: "INVALID_HARD_GATE",
        entityId: edge.id,
        message: "Hard gates must be high-confidence prerequisite_for edges with weight at least 0.8.",
      });
    }
    if (edge.reviewStatus !== "approved") {
      issues.push({
        code: "UNREVIEWED_GATE",
        entityId: edge.id,
        message: "A hard gate cannot affect a reviewed release until its edge is approved.",
      });
    }
  }
  if (edge.type === "supports" && gate !== "soft") {
    issues.push({
      code: "SUPPORT_CANNOT_GATE",
      entityId: edge.id,
      message: "Support relationships must be marked soft and can never gate readiness.",
    });
  }
  if (edge.type === "prerequisite_for" && gate === "soft") {
    issues.push({
      code: "SOFT_PREREQUISITE_MISUSE",
      entityId: edge.id,
      message: "Use a supports edge for a non-gating relationship.",
    });
  }
}

/** Validates schema, topology, gating, lifecycle, review, and standards semantics.
 * @param input Candidate Codecamp graph release.
 * @returns A fail-closed result with stable, actionable issue codes.
 */
export function validateCodeKnowledgeGraph(input: unknown): CodeGraphValidationResult {
  const parsed = CodeKnowledgeGraphSchema.safeParse(input);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((issue) => ({
      code: schemaIssueCode(issue.message),
      message: issue.message,
      path: issue.path.join("."),
    }));
    return { valid: false, issues };
  }

  const graph = parsed.data;
  const issues: CodeGraphIssue[] = validateKnowledgeSpace(graph.knowledgeSpace).errors.map(
    (issue) => ({
      code: issue.code,
      message: issue.message,
      entityId: issue.nodeId ?? issue.edgeId,
    }),
  );

  const reachable = containsReachableObjectives(
    graph.knowledgeSpace.nodes,
    graph.knowledgeSpace.edges,
  );
  for (const node of graph.knowledgeSpace.nodes) {
    const metadata = node.metadata as { lifecycle?: string; objectiveType?: string };
    const isObjective = node.domain === "codecamp" && ["skill", "concept"].includes(node.kind);
    if (isObjective && metadata.lifecycle === "active" && !reachable.has(node.id)) {
      issues.push({
        code: "DISCONNECTED_OBJECTIVE",
        entityId: node.id,
        message: "Every active objective must be reachable from the Codecamp domain containment tree.",
      });
    }
    if (
      node.kind === "standard" &&
      (node.domain === "codecamp" || metadata.objectiveType !== "projection")
    ) {
      issues.push({
        code: "STANDARD_NOT_PROJECTION",
        entityId: node.id,
        message: "External standards must remain projection nodes outside the Codecamp product domain.",
      });
    }
  }

  for (const edge of graph.knowledgeSpace.edges) validateGate(edge, issues);

  const existingCycles = new Set(
    issues.filter((issue) => issue.code === "PREREQUISITE_CYCLE").map((issue) => issue.entityId),
  );
  for (const cycle of getPrerequisiteCycles(graph.knowledgeSpace)) {
    const entityId = cycle.edgeIds.join(", ");
    if (!existingCycles.has(entityId)) {
      issues.push({
        code: "PREREQUISITE_CYCLE",
        entityId,
        message: `Prerequisite cycle detected: ${cycle.cycle.join(" -> ")}`,
      });
    }
  }

  issues.sort((left, right) =>
    `${left.code}:${left.entityId ?? left.path ?? ""}`.localeCompare(
      `${right.code}:${right.entityId ?? right.path ?? ""}`,
    ),
  );
  return { valid: issues.length === 0, issues };
}

/** Narrows a previously validated value without re-parsing at downstream call sites.
 * @param graph Validated Codecamp graph release.
 * @returns The same immutable contract value.
 */
export function asCodeKnowledgeGraph(graph: CodeKnowledgeGraph): CodeKnowledgeGraph {
  return graph;
}
