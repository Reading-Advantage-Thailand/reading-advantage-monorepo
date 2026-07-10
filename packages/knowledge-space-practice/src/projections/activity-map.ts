import type { KnowledgeSpaceNode, KnowledgeSpaceEdge } from '@reading-advantage/knowledge-space-core';
import type { ProjectedActivity } from './types.js';
import type { KnowledgeBlueprint, WorkedExampleSpec, GuidedPracticeSpec, IndependentPracticeSpec } from '../blueprints/index.js';

const MODE_SORT_ORDER: Record<string, number> = {
  worked_example: 0,
  guided_practice: 1,
  independent_practice: 2,
  assessment: 3,
};

const SPEC_TO_MODE: Array<{
  specKey: 'workedExampleSpec' | 'guidedPracticeSpec' | 'independentPracticeSpec';
  mode: ProjectedActivity['mode'];
}> = [
  { specKey: 'workedExampleSpec', mode: 'worked_example' },
  { specKey: 'guidedPracticeSpec', mode: 'guided_practice' },
  { specKey: 'independentPracticeSpec', mode: 'independent_practice' },
];

/**
 * Concept Aggregator resolution: when a blueprint's nodeId targets a `concept`
 * node, the projection must resolve it to a child `skill` node before emitting
 * a practice row. This rule keeps downstream consumers (SRS, planner,
 * visualization) free of concept-vs-skill branching.
 *
 * `findChildSkills` returns the direct child skills of a concept node via
 * `contains` edges where the concept is the source.
 */
export function findChildSkills(
  conceptNode: KnowledgeSpaceNode,
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
): KnowledgeSpaceNode[] {
  if (conceptNode.kind !== 'concept') return [];

  return edges
    .filter((e) => e.type === 'contains' && e.sourceId === conceptNode.id)
    .map((e) => nodes.find((n) => n.id === e.targetId))
    .filter((n): n is KnowledgeSpaceNode => n != null && n.kind === 'skill');
}

/**
 * Concept Aggregator resolution: pick a single child skill.
 *
 * Deterministic — alphabetically first by id — so any caller that wants
 * a single-skill resolution (rather than the projection's all-children
 * iteration) gets a stable answer. Kept as a public helper; the
 * `projectActivityMap` projection itself iterates over every child
 * skill (FR-13 fix) so the projection emits one row set per child skill
 * rather than collapsing to a single skill.
 */
export function selectSkill(childSkills: KnowledgeSpaceNode[]): KnowledgeSpaceNode | null {
  if (childSkills.length === 0) return null;
  const sorted = [...childSkills].sort((a, b) => a.id.localeCompare(b.id));
  return sorted[0]!;
}

/**
 * Map knowledge-space nodes, edges, and blueprints into `practice.v1` activity
 * map rows. Each blueprint becomes one or more `ProjectedActivity` rows that
 * reference the underlying graph for provenance.
 *
 * FR-13: when a blueprint targets a `concept` aggregator node, the
 * projection iterates over every child skill (returned by
 * `findChildSkills`) and emits one row set per child skill. Concept
 * aggregators that bundle N child skills therefore produce N row sets
 * (each with the worked/guided/independent specs the blueprint carries).
 * A concept with zero `contains` edges emits no rows.
 *
 * Projections are regenerated outputs — they are not source truth. Review diffs
 * against previously generated activity maps before replacing app artifacts.
 *
 * @param {KnowledgeSpaceNode[]} nodes - Knowledge space nodes
 * @param {KnowledgeSpaceEdge[]} edges - Knowledge space edges
 * @param {KnowledgeBlueprint[]} blueprints - Knowledge blueprints (worked example, guided, independent, assessment)
 * @returns {ProjectedActivity[]} Sorted array of projected activities.
 */
export function projectActivityMap(
  nodes: KnowledgeSpaceNode[],
  edges: KnowledgeSpaceEdge[],
  blueprints: KnowledgeBlueprint[],
): ProjectedActivity[] {
  const rows: ProjectedActivity[] = [];

  for (const bp of blueprints) {
    // Concept Aggregator resolution: if the blueprint targets a concept
    // node, resolve to every child skill and emit one row set per child
    // skill. If the blueprint targets a non-concept node, emit one row
    // set keyed by that node. If the blueprint targets an unknown node,
    // skip it.
    const blueprintNode = nodes.find((n) => n.id === bp.nodeId);
    if (!blueprintNode) continue;
    const resolvedNodes: KnowledgeSpaceNode[] =
      blueprintNode.kind === 'concept'
        ? findChildSkills(blueprintNode, nodes, edges)
        : [blueprintNode];
    if (resolvedNodes.length === 0) continue;

    // Enrich sourceNodeIds from prerequisite/supports edges targeting this node
    const edgeSourceIds = edges
      .filter(
        (e) =>
          (e.type === 'prerequisite_for' ||
            e.type === 'supports' ||
            e.type === 'extends') &&
          e.targetId === bp.nodeId,
      )
      .map((e) => e.sourceId);

    // Merge blueprint sourceNodeIds with edge-derived sourceNodeIds (deduped)
    const allSourceIds = [...new Set([...bp.sourceNodeIds, ...edgeSourceIds])];

    // Enrich alignmentNodeIds from aligned_to_standard edges
    const edgeAlignmentIds = edges
      .filter(
        (e) => e.type === 'aligned_to_standard' && e.sourceId === bp.nodeId,
      )
      .map((e) => e.targetId);

    const allAlignmentIds = [...new Set([...bp.alignmentNodeIds, ...edgeAlignmentIds])];

    const rendererKey = bp.rendererKey ||
      bp.rendererModeMap?.independentPractice ||
      bp.rendererModeMap?.guidedPractice ||
      bp.rendererModeMap?.worked ||
      'default';

    const gradingConfig: Record<string, unknown> = bp.gradingSpec
      ? {
          partIds: bp.gradingSpec.partIds,
          passingScore: bp.gradingSpec.passingScore,
          partialCredit: bp.gradingSpec.partialCredit,
          rubric: bp.gradingSpec.rubric,
        }
      : {};

    const srsEligible =
      bp.independentPracticeSpec != null ||
      (bp.generatorKey != null && bp.generatorKey.length > 0);

    for (const resolvedNode of resolvedNodes) {
      for (const { specKey, mode } of SPEC_TO_MODE) {
        const spec = bp[specKey];
        if (!spec) continue;

        const stableActivityId = `${resolvedNode.id}.${mode}`;

        let props: Record<string, unknown> = {};
        if (specKey === 'workedExampleSpec') {
          const wspec = spec as WorkedExampleSpec;
          props = {
            prompt: wspec.prompt,
            givens: wspec.givens,
            steps: wspec.steps,
            explanation: wspec.explanation,
          };
        } else if (specKey === 'guidedPracticeSpec') {
          const gspec = spec as GuidedPracticeSpec;
          props = {
            scaffoldedPrompt: gspec.scaffoldedPrompt,
            stepPrompts: gspec.stepPrompts,
            hints: gspec.hints,
            checksPerStep: gspec.checksPerStep,
            revealPolicy: gspec.revealPolicy,
          };
        } else if (specKey === 'independentPracticeSpec') {
          const ispec = spec as IndependentPracticeSpec;
          props = {
            variantParameters: ispec.variantParameters,
            answerSchema: ispec.answerSchema,
            gradingRules: ispec.gradingRules,
            replayPolicy: ispec.replayPolicy,
          };
        }

        rows.push({
          stableActivityId,
          nodeId: resolvedNode.id,
          sourceNodeIds: allSourceIds,
          rendererKey,
          mode,
          alignmentNodeIds: allAlignmentIds,
          props,
          gradingConfig,
          srsEligible,
        });
      }
    }
  }

  // Stable sort: by nodeId then mode order
  rows.sort((a, b) => {
    const nodeCmp = a.nodeId.localeCompare(b.nodeId);
    if (nodeCmp !== 0) return nodeCmp;
    return (
      (MODE_SORT_ORDER[a.mode] ?? 99) - (MODE_SORT_ORDER[b.mode] ?? 99)
    );
  });

  return rows;
}
