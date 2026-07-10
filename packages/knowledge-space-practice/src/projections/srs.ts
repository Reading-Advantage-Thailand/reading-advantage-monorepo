import type { KnowledgeSpaceNode, KnowledgeSpaceEdge } from '@reading-advantage/knowledge-space-core';
import type { SrsProjectionEntry } from './types.js';
import type { KnowledgeBlueprint } from '../blueprints/index.js';

/**
 * Generate SRS projection entries from knowledge-space nodes, edges, and
 * blueprints. Each entry maps a skill or task-blueprint node to an SRS card
 * target with its prerequisite and standard context.
 *
 * Projections are regenerated outputs — they are not source truth. Review diffs
 * before feeding into the SRS engine.
 *
 * @param {KnowledgeSpaceNode[]} nodes - Knowledge space nodes
 * @param {KnowledgeSpaceEdge[]} edges - Knowledge space edges
 * @param {KnowledgeBlueprint[]} blueprints - Knowledge blueprints
 * @returns {SrsProjectionEntry[]} - Sorted array of SRS projection entries
 */
export function projectSrsInputs(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
  blueprints: KnowledgeBlueprint[],
): SrsProjectionEntry[] {
  const blueprintByNodeId = new Map(blueprints.map((b) => [b.nodeId, b]));

  const entries: SrsProjectionEntry[] = [];

  for (const node of nodes) {
    if (node.kind !== 'skill' && node.kind !== 'task_blueprint') continue;

    const blueprint = blueprintByNodeId.get(node.id);

    // Standards from aligned_to_standard edges
    const standards = edges
      .filter(
        (e) => e.type === 'aligned_to_standard' && e.sourceId === node.id,
      )
      .map((e) => e.targetId);

    // Also include blueprint alignmentNodeIds as standards
    if (blueprint) {
      for (const aid of blueprint.alignmentNodeIds) {
        if (!standards.includes(aid)) standards.push(aid);
      }
    }

    // Prerequisites from prerequisite_for edges targeting this node
    const prerequisites = edges
      .filter(
        (e) => e.type === 'prerequisite_for' && e.targetId === node.id,
      )
      .map((e) => e.sourceId);

    const difficulty =
      node.difficulty ??
      (blueprint?.metadata?.difficulty as number | undefined) ??
      0.5;

    const generatorKey = node.generatorKey ?? blueprint?.generatorKey;
    const generatorReady =
      node.independentPracticeReady === true ||
      (blueprint?.independentPracticeSpec != null) ||
      (blueprint?.generatorKey != null && blueprint.generatorKey.length > 0);

    const blueprintId = blueprint
      ? `${node.id}.blueprint`
      : `srs.${node.id}`;

    entries.push({
      nodeId: node.id,
      blueprintId,
      standards,
      prerequisites,
      difficulty,
      generatorKey,
      generatorReady,
      equivalentNodeIds: edges
        .filter(
          (e) =>
            e.type === 'equivalent_to' &&
            (e.sourceId === node.id || e.targetId === node.id),
        )
        .map((e) => (e.sourceId === node.id ? e.targetId : e.sourceId)),
    });
  }

  // Stable sort by nodeId
  entries.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  return entries;
}
