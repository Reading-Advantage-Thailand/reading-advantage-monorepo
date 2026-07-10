// projection module exports — domain-neutral practice and visualization projections

export type {
  KnowledgeBlueprint,
  ProjectedActivity,
  SrsProjectionEntry,
  TeacherEvidence,
  StandardCoverage,
  SkillCoverage,
  PrerequisiteGap,
  AttemptArtifact,
  EquivalentComponentSummary,
  VisualNodeV1,
  VisualEdgeV1,
  StudentVisualizationV1,
  ParentVisualizationV1,
  TeacherHeatmapCell,
  InterventionGroup,
  TeacherVisualizationV1,
} from './types.js';

export {
  visualNodeV1Schema,
  visualEdgeV1Schema,
  studentVisualizationV1Schema,
  parentVisualizationV1Schema,
  teacherVisualizationV1Schema,
} from './schemas.js';

export { projectActivityMap } from './activity-map.js';
export { projectSrsInputs } from './srs.js';
export { projectTeacherEvidence } from './teacher-evidence.js';
export {
  projectStudentVisualization,
  projectParentVisualization,
  projectTeacherVisualization,
} from './visualization.js';

export {
  syntheticMathKnowledgeSpace,
  syntheticEnglishGseKnowledgeSpace,
  syntheticBlueprint,
  syntheticEnglishBlueprintProjection,
  syntheticLearnerState,
} from './fixtures.js';
