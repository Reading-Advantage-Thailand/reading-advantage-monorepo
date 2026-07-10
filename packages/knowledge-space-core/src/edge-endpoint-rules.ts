// Canonical edge endpoint pairing rules for knowledge-space.v1.
//
// These rules describe which node-kind pairs are valid for each edge type.
// They are the single source of truth for the constraint; `schemas.ts` and
// `validation.ts` both import `EDGE_ENDPOINT_RULES` from this module so the
// rules can never drift between the Zod refinement and the runtime
// `getInvalidEdgePairings` helper.

import type { EdgeType, NodeKind } from './types.js';

export interface EdgeSourceTargetConstraint {
  readonly edgeType: EdgeType;
  readonly sourceKinds?: ReadonlyArray<NodeKind>;
  readonly targetKinds: ReadonlyArray<NodeKind>;
  readonly crossDomainOnly?: boolean;
}

export const EDGE_ENDPOINT_RULES: ReadonlyArray<EdgeSourceTargetConstraint> = [
  { edgeType: 'rendered_by', sourceKinds: ['skill', 'worked_example', 'task_blueprint', 'concept'], targetKinds: ['renderer'] },
  { edgeType: 'generated_by', sourceKinds: ['skill', 'task_blueprint', 'concept'], targetKinds: ['generator'] },
  { edgeType: 'aligned_to_standard', sourceKinds: ['skill', 'worked_example', 'task_blueprint', 'concept'], targetKinds: ['standard'] },
  { edgeType: 'transfers_to', sourceKinds: ['skill', 'concept'], targetKinds: ['skill', 'concept'], crossDomainOnly: true },
  { edgeType: 'common_misconception_with', targetKinds: ['misconception'] },
  { edgeType: 'contains', sourceKinds: ['domain', 'content_group', 'instructional_unit'], targetKinds: ['content_group', 'instructional_unit', 'worked_example', 'skill', 'concept', 'task_blueprint'] },
  { edgeType: 'remediated_by', sourceKinds: ['misconception'], targetKinds: ['worked_example', 'task_blueprint', 'skill'] },
];
