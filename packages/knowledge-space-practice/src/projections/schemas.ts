import { z } from 'zod';

// ---------------------------------------------------------------------------
// visualization.v1 Zod schemas
// ---------------------------------------------------------------------------

export const visualNodeV1Schema = z.object({
  nodeId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  state: z.enum(['mastered', 'ready', 'nearly_ready', 'blocked', 'review_due', 'unknown']),
  difficulty: z.number().min(0).max(1).optional(),
  domain: z.string().optional(),
});

export const visualEdgeV1Schema = z.object({
  sourceId: z.string().min(1),
  targetId: z.string().min(1),
  type: z.enum(['prerequisite', 'supports', 'extends']),
  weight: z.number().min(0).max(1),
});

export const studentVisualizationV1Schema = z.object({
  schemaVersion: z.literal('v1'),
  mastered: z.array(visualNodeV1Schema),
  ready: z.array(visualNodeV1Schema),
  nearlyReady: z.array(visualNodeV1Schema),
  blocked: z.array(visualNodeV1Schema),
  reviewDue: z.array(visualNodeV1Schema),
  recommendedNext: z.array(visualNodeV1Schema),
  edges: z.array(visualEdgeV1Schema),
  activeMisconceptionCount: z.number().int().min(0),
});

export const parentVisualizationV1Schema = z.object({
  schemaVersion: z.literal('v1'),
  canDoSummary: z.string(),
  nextFocus: z.string(),
  blockers: z.array(z.string()),
  progressTrend: z.enum(['improving', 'stable', 'declining', 'unknown']),
  nodes: z.array(visualNodeV1Schema),
});

const teacherHeatmapCellSchema = z.object({
  nodeId: z.string().min(1),
  title: z.string().min(1),
  masteredCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  proficiencyRate: z.number().min(0).max(1),
});

const prerequisiteGapSchema = z.object({
  nodeId: z.string().min(1),
  title: z.string().min(1),
  missingPrerequisites: z.array(z.string()),
  blockingLevel: z.enum(['full', 'partial']),
});

const interventionGroupSchema = z.object({
  groupId: z.string().min(1),
  label: z.string().min(1),
  nodeIds: z.array(z.string()),
  studentCount: z.number().int().min(0),
});

const misconceptionClusterSchema = z.object({
  label: z.string().min(1),
  relatedNodeIds: z.array(z.string()),
});

const standardsCoverageSchema = z.object({
  standardId: z.string().min(1),
  title: z.string().min(1),
  proficiencyRate: z.number().min(0).max(1),
});

export const teacherVisualizationV1Schema = z.object({
  schemaVersion: z.literal('v1'),
  heatmap: z.array(teacherHeatmapCellSchema),
  bottleneckNodes: z.array(visualNodeV1Schema),
  prerequisiteGaps: z.array(prerequisiteGapSchema),
  misconceptionClusters: z.array(misconceptionClusterSchema),
  interventionGroups: z.array(interventionGroupSchema),
  standardsCoverage: z.array(standardsCoverageSchema),
  activeMisconceptionStudentCount: z.number().int().min(0),
});
