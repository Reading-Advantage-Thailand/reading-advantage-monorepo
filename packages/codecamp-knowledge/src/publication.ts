import type { KnowledgeSpace } from "@reading-advantage/knowledge-space-core";

import type { CodeKnowledgeGraph } from "./contracts.js";

/** Produces the immutable runtime projection from one authored graph release.
 * @param graph Validated authored graph release.
 * @returns Active reviewed nodes plus approved edges whose endpoints remain published.
 */
export function buildPublishedKnowledgeSpace(graph: CodeKnowledgeGraph): KnowledgeSpace {
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
