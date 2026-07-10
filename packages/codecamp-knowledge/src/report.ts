import type { CodeKnowledgeGraph } from "./contracts.js";
import { validateCodeKnowledgeGraph } from "./validation.js";

/** Deterministic topology and governance summary for a graph release. */
export interface CodeGraphReport {
  graphId: string;
  version: string;
  nodes: number;
  edges: number;
  hardGates: number;
  softSupports: number;
  standardsProjections: number;
  disconnectedObjectives: number;
  clusterCounts: Record<string, number>;
  reviewCounts: Record<string, number>;
  lifecycleCounts: Record<string, number>;
}

/** Deterministic ID-level impact report between two Codecamp graph versions. */
export interface CodeGraphDiff {
  fromVersion: string;
  toVersion: string;
  addedNodeIds: string[];
  removedNodeIds: string[];
  changedNodeIds: string[];
  addedEdgeIds: string[];
  removedEdgeIds: string[];
}

function countBy(values: string[]): Record<string, number> {
  return [...new Set(values)]
    .sort()
    .reduce<Record<string, number>>((counts, value) => {
      counts[value] = values.filter((candidate) => candidate === value).length;
      return counts;
    }, {});
}

/** Builds a stable summary used by CI and human curriculum review.
 * @param graph Validated Codecamp graph release.
 * @returns Counts ordered deterministically by cluster, review, and lifecycle labels.
 */
export function buildCodeGraphReport(graph: CodeKnowledgeGraph): CodeGraphReport {
  const validation = validateCodeKnowledgeGraph(graph);
  return {
    graphId: graph.graphId,
    version: graph.version,
    nodes: graph.knowledgeSpace.nodes.length,
    edges: graph.knowledgeSpace.edges.length,
    hardGates: graph.knowledgeSpace.edges.filter((edge) => edge.metadata?.gate === "hard").length,
    softSupports: graph.knowledgeSpace.edges.filter(
      (edge) => edge.type === "supports" && edge.metadata?.gate === "soft",
    ).length,
    standardsProjections: graph.knowledgeSpace.nodes.filter((node) => node.kind === "standard").length,
    disconnectedObjectives: validation.issues.filter(
      (issue) => issue.code === "DISCONNECTED_OBJECTIVE",
    ).length,
    clusterCounts: countBy(
      graph.knowledgeSpace.nodes.map((node) => String(node.metadata.cluster)),
    ),
    reviewCounts: countBy(graph.knowledgeSpace.nodes.map((node) => node.reviewStatus)),
    lifecycleCounts: countBy(
      graph.knowledgeSpace.nodes.map((node) => String(node.metadata.lifecycle)),
    ),
  };
}

function sortedDifference(left: Set<string>, right: Set<string>): string[] {
  return [...left].filter((id) => !right.has(id)).sort();
}

/** Compares stable IDs and authored node content across two releases.
 * @param before Earlier validated graph release.
 * @param after Later validated graph release.
 * @returns Deterministically sorted additions, removals, and changed-node IDs.
 */
export function diffCodeKnowledgeGraphs(
  before: CodeKnowledgeGraph,
  after: CodeKnowledgeGraph,
): CodeGraphDiff {
  const beforeNodes = new Map(before.knowledgeSpace.nodes.map((node) => [node.id, node]));
  const afterNodes = new Map(after.knowledgeSpace.nodes.map((node) => [node.id, node]));
  const beforeEdges = new Set(before.knowledgeSpace.edges.map((edge) => edge.id));
  const afterEdges = new Set(after.knowledgeSpace.edges.map((edge) => edge.id));
  const changedNodeIds = [...beforeNodes.keys()]
    .filter((id) => {
      const next = afterNodes.get(id);
      return next !== undefined && JSON.stringify(beforeNodes.get(id)) !== JSON.stringify(next);
    })
    .sort();
  return {
    fromVersion: before.version,
    toVersion: after.version,
    addedNodeIds: sortedDifference(new Set(afterNodes.keys()), new Set(beforeNodes.keys())),
    removedNodeIds: sortedDifference(new Set(beforeNodes.keys()), new Set(afterNodes.keys())),
    changedNodeIds,
    addedEdgeIds: sortedDifference(afterEdges, beforeEdges),
    removedEdgeIds: sortedDifference(beforeEdges, afterEdges),
  };
}
