import { z } from 'zod';
import type { ObjectivePriority } from './contract.js';

/**
 * An objective policy assigns a practice priority to a competency standard
 * for a specific course.
 *
 * Policies drive queue prioritization in daily practice sessions:
 * - essential: Must-master objectives; appear first in queues
 * - supporting: Secondary objectives; appear after essential
 * - extension: Enrichment objectives; appear when essentials are met
 * - triaged: Deprecated or low-priority objectives; excluded from queues
 */
export type ObjectivePolicy = {
  /** Reference to the competency standard ID */
  standardId: string;

  /** Practice priority assigned to this standard */
  policy: ObjectivePriority;

  /** Course identifier (e.g. "integrated-math-3") */
  courseKey: string;

  /** Numeric priority for queue ordering (from PRIORITY_DEFAULTS) */
  priority: number;
};

export const OBJECTIVE_PRIORITY_VALUES = [
  'essential',
  'supporting',
  'extension',
  'triaged',
] as const;

export const objectivePrioritySchema = z.enum(OBJECTIVE_PRIORITY_VALUES);

export const objectivePolicySchema = z.object({
  standardId: z.string().trim().min(1),
  policy: objectivePrioritySchema,
  courseKey: z.string().trim().min(1),
  priority: z.number().int(),
});

export type ObjectivePolicyInput = z.input<typeof objectivePolicySchema>;
