import type { KnowledgeSpace } from "@reading-advantage/knowledge-space-core";

import type { CodeKnowledgeGraph } from "./contracts.js";
import { validateCodeKnowledgeGraph } from "./validation.js";

/** Produces the immutable runtime projection from one authored graph release.
 * @param graph Validated authored graph release.
 * @returns Active reviewed nodes plus approved edges whose endpoints remain published.
 * @throws When the release is not reviewed or fails graph validation.
 */
export function buildPublishedKnowledgeSpace(graph: CodeKnowledgeGraph): KnowledgeSpace {
  if (graph.releaseStatus !== "reviewed") {
    throw new Error("Only reviewed graph releases can be projected for runtime publication.");
  }
  const validation = validateCodeKnowledgeGraph(graph);
  if (!validation.valid) {
    throw new Error(
      `Cannot publish an invalid Codecamp graph: ${validation.issues
        .map((issue) => `${issue.code}:${issue.entityId ?? issue.path ?? "graph"}`)
        .join(", ")}`,
    );
  }
  const nodes = graph.knowledgeSpace.nodes.filter(
    (node) => node.metadata.lifecycle === "active" && node.reviewStatus === "approved",
  );
  const nodeIds = new Set(nodes.map((node) => node.id));
  const edges = graph.knowledgeSpace.edges.filter(
    (edge) =>
      edge.reviewStatus === "approved" &&
      nodeIds.has(edge.sourceId) &&
      nodeIds.has(edge.targetId),
  );
  return {
    nodes: structuredClone(nodes),
    edges: structuredClone(edges),
  };
}
