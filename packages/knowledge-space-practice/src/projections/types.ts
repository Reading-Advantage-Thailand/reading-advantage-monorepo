export interface ProjectedActivity {
  stableActivityId: string;
  nodeId: string;
  sourceNodeIds: string[];
  rendererKey: string;
  mode: 'worked_example' | 'guided_practice' | 'independent_practice' | 'assessment';
  alignmentNodeIds: string[];
  props: Record<string, unknown>;
  gradingConfig: Record<string, unknown>;
  srsEligible: boolean;
}

// ---------------------------------------------------------------------------
// SRS projection
// ---------------------------------------------------------------------------

export interface SrsProjectionEntry {
  nodeId: string;
  blueprintId: string;
  standards: string[];
  prerequisites: string[];
  difficulty: number;
  generatorKey?: string;
  generatorReady: boolean;
  /** Nodes from other courses considered equivalent (via equivalent_to edges). */
  equivalentNodeIds: string[];
}

// ---------------------------------------------------------------------------
// Teacher evidence projection
// ---------------------------------------------------------------------------

export interface TeacherEvidence {
  standards: StandardCoverage[];
  skills: SkillCoverage[];
  prerequisiteGaps: PrerequisiteGap[];
  attemptArtifacts: AttemptArtifact[];
  /** Connected components of equivalent skills across courses. */
  equivalentComponents: EquivalentComponentSummary[];
}

export interface EquivalentComponentSummary {
  componentId: string;
  nodeIds: string[];
  coursesCovered: string[];
  edgeCount: number;
}

export interface StandardCoverage {
  standardId: string;
  standardTitle: string;
  nodeIds: string[];
  workedExampleCount: number;
  guidedPracticeCount: number;
  independentPracticeCount: number;
}

export interface SkillCoverage {
  nodeId: string;
  title: string;
  kind: string;
  standardsCovered: string[];
  prerequisitesMet: boolean;
  independentPracticeReady: boolean;
  /** Equivalent skills from other courses (via equivalent_to edges). */
  equivalentNodeIds: string[];
}

export interface PrerequisiteGap {
  nodeId: string;
  title: string;
  missingPrerequisites: string[];
  blockingLevel: 'full' | 'partial';
}

export interface AttemptArtifact {
  nodeId: string;
  partIds: string[];
  submissionProvenance: string;
}

// ---------------------------------------------------------------------------
// Visualization v1 types
// ---------------------------------------------------------------------------

export interface VisualNodeV1 {
  nodeId: string;
  title: string;
  description?: string;
  state: 'mastered' | 'ready' | 'nearly_ready' | 'blocked' | 'review_due' | 'unknown';
  difficulty?: number;
  domain?: string;
}

export interface VisualEdgeV1 {
  sourceId: string;
  targetId: string;
  type: 'prerequisite' | 'supports' | 'extends';
  weight: number;
}

export interface StudentVisualizationV1 {
  schemaVersion: 'v1';
  mastered: VisualNodeV1[];
  ready: VisualNodeV1[];
  nearlyReady: VisualNodeV1[];
  blocked: VisualNodeV1[];
  reviewDue: VisualNodeV1[];
  recommendedNext: VisualNodeV1[];
  edges: VisualEdgeV1[];
  activeMisconceptionCount: number;
}

export interface ParentVisualizationV1 {
  schemaVersion: 'v1';
  canDoSummary: string;
  nextFocus: string;
  blockers: string[];
  progressTrend: 'improving' | 'stable' | 'declining' | 'unknown';
  nodes: VisualNodeV1[];
}

export interface TeacherHeatmapCell {
  nodeId: string;
  title: string;
  masteredCount: number;
  totalCount: number;
  proficiencyRate: number;
}

export interface InterventionGroup {
  groupId: string;
  label: string;
  nodeIds: string[];
  studentCount: number;
}

export interface TeacherVisualizationV1 {
  schemaVersion: 'v1';
  heatmap: TeacherHeatmapCell[];
  bottleneckNodes: VisualNodeV1[];
  prerequisiteGaps: PrerequisiteGap[];
  misconceptionClusters: Array<{ label: string; relatedNodeIds: string[] }>;
  interventionGroups: InterventionGroup[];
  standardsCoverage: Array<{ standardId: string; title: string; proficiencyRate: number }>;
  activeMisconceptionStudentCount: number;
}

// Re-export blueprint types used by projection callers
export type { KnowledgeBlueprint } from '../blueprints/index.js';
