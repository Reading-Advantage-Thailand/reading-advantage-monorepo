import type { KnowledgeSpaceNode, KnowledgeSpaceEdge } from '@reading-advantage/knowledge-space-core';
import type {
  TeacherEvidence,
  StandardCoverage,
  SkillCoverage,
  PrerequisiteGap,
  AttemptArtifact,
  EquivalentComponentSummary,
} from './types.js';

/**
 * Generate teacher evidence metadata from the knowledge space graph. Produces
 * coverage reports for standards and skills, prerequisite gap analysis, and
 * attempt artifact references.
 *
 * Projections are regenerated outputs — they are not source truth. Review diffs
 * before feeding teachers/UI with evidence summaries.
 *
 * @param {KnowledgeSpaceNode[]} nodes - Knowledge space nodes
 * @param {KnowledgeSpaceEdge[]} edges - Knowledge space edges
 * @returns {TeacherEvidence} - TeacherEvidence with standard coverage, skill coverage, prerequisite gaps, and attempt artifacts
 */
export function projectTeacherEvidence(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
  classStats: Record<string, { mastered: number; total: number }> = {},
): TeacherEvidence {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // --- Standard coverage ---
  const standardMap = new Map<string, StandardCoverage>();
  const standardNodes = nodes.filter((n) => n.kind === 'standard');

  for (const std of standardNodes) {
    standardMap.set(std.id, {
      standardId: std.id,
      standardTitle: std.title,
      nodeIds: [],
      workedExampleCount: 0,
      guidedPracticeCount: 0,
      independentPracticeCount: 0,
    });
  }

  for (const edge of edges) {
    if (edge.type !== 'aligned_to_standard') continue;
    const cov = standardMap.get(edge.targetId);
    if (!cov) continue;
    cov.nodeIds.push(edge.sourceId);

    const sourceNode = nodeMap.get(edge.sourceId);
    if (!sourceNode) continue;
    if (sourceNode.kind === 'worked_example') cov.workedExampleCount++;
    else if (sourceNode.kind === 'task_blueprint') {
      if (sourceNode.metadata?.practiceMode === 'guided') cov.guidedPracticeCount++;
      else cov.independentPracticeCount++;
    }
  }

  const standards: StandardCoverage[] = Array.from(standardMap.values());
  standards.sort((a, b) => a.standardId.localeCompare(b.standardId));

  // --- Skill coverage ---
  const skills: SkillCoverage[] = [];
  const skillNodes = nodes.filter((n) => n.kind === 'skill');

  for (const node of skillNodes) {
    const standardsCovered = edges
      .filter(
        (e) => e.type === 'aligned_to_standard' && e.sourceId === node.id,
      )
      .map((e) => e.targetId);

    const prereqs = edges.filter(
      (e) => e.type === 'prerequisite_for' && e.targetId === node.id,
    );
    const prerequisitesMet = prereqs.length === 0;

    skills.push({
      nodeId: node.id,
      title: node.title,
      kind: node.kind,
      standardsCovered,
      prerequisitesMet,
      independentPracticeReady: node.independentPracticeReady ?? false,
      equivalentNodeIds: edges
        .filter(
          (e) =>
            e.type === 'equivalent_to' &&
            (e.sourceId === node.id || e.targetId === node.id),
        )
        .map((e) => (e.sourceId === node.id ? e.targetId : e.sourceId)),
    });
  }

  skills.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  // --- Prerequisite gaps ---
  const prerequisiteGaps: PrerequisiteGap[] = [];

  for (const node of nodes) {
    if (node.kind === 'domain' || node.kind === 'content_group') continue;

    const prereqEdges = edges.filter(
      (e) => e.type === 'prerequisite_for' && e.targetId === node.id,
    );

    if (prereqEdges.length === 0) continue;

    const stats = classStats[node.id];
    const proficiency = stats && stats.total > 0 ? stats.mastered / stats.total : 0;
    if (proficiency >= 0.6) continue;

    const missingPrerequisites = prereqEdges.map((e) => e.sourceId);
    const blockingLevel: 'full' | 'partial' = proficiency < 0.3 ? 'full' : 'partial';

    prerequisiteGaps.push({
      nodeId: node.id,
      title: node.title,
      missingPrerequisites,
      blockingLevel,
    });
  }

  prerequisiteGaps.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  // --- Attempt artifacts (from worked_example nodes) ---
  const attemptArtifacts: AttemptArtifact[] = [];
  const workedExampleNodes = nodes.filter((n) => n.kind === 'worked_example');

  for (const node of workedExampleNodes) {
    attemptArtifacts.push({
      nodeId: node.id,
      partIds: [],
      submissionProvenance: `knowledge-space.${node.domain}`,
    });
  }

  attemptArtifacts.sort((a, b) => a.nodeId.localeCompare(b.nodeId));

  // --- Equivalent components ---
  const equivEdges = edges.filter((e) => e.type === 'equivalent_to');
  const equivalentComponents: EquivalentComponentSummary[] = [];
  const equivAdj = new Map<string, Set<string>>();
  for (const e of equivEdges) {
    if (!equivAdj.has(e.sourceId)) equivAdj.set(e.sourceId, new Set());
    if (!equivAdj.has(e.targetId)) equivAdj.set(e.targetId, new Set());
    equivAdj.get(e.sourceId)!.add(e.targetId);
    equivAdj.get(e.targetId)!.add(e.sourceId);
  }
  const visited = new Set<string>();
  let compIdx = 0;
  for (const nodeId of equivAdj.keys()) {
    if (visited.has(nodeId)) continue;
    const compNodes: string[] = [];
    const queue = [nodeId];
    visited.add(nodeId);
    while (queue.length > 0) {
      const cur = queue.shift()!;
      compNodes.push(cur);
      for (const nb of equivAdj.get(cur) ?? []) {
        if (!visited.has(nb)) { visited.add(nb); queue.push(nb); }
      }
    }
    const compNodeSet = new Set(compNodes);
    const compEdges = equivEdges.filter(
      (e) => compNodeSet.has(e.sourceId) && compNodeSet.has(e.targetId),
    );
    const courses = [...new Set(compNodes.map((n) => nodeMap.get(n)?.domain ?? n.split('.').slice(0, 2).join('.')))].sort();
    equivalentComponents.push({
      componentId: `equiv-comp-${String(compIdx + 1).padStart(3, '0')}`,
      nodeIds: [...compNodes].sort(),
      coursesCovered: courses,
      edgeCount: compEdges.length,
    });
    compIdx++;
  }
  equivalentComponents.sort((a, b) => a.componentId.localeCompare(b.componentId));

  return { standards, skills, prerequisiteGaps, attemptArtifacts, equivalentComponents };
}
