import { z } from 'zod';
import { getKnowledgeState } from './knowledge-state-engine.js';
import type { KnowledgeStateStudentRef, KnowledgeStateEvidence } from './knowledge-state-engine.js';
import type { KnowledgeStateEntry, MasteryThresholds } from './mastery-state.js';
import type { KnowledgeSpace } from './types.js';
import { computeWeightedReadiness } from './weighted-readiness.js';

export const knowledgeStateSchema = z.object({
  skills: z.array(z.object({
    nodeId: z.string().min(1),
    mastery: z.number().min(0).max(1),
  })),
});

export const displayLevelItemSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  minMastery: z.number().min(0).max(1),
});

/**
 * Display-level band: ordered, id-unique, non-decreasing minMastery.
 *
 * Contract: a valid band must contain at least one level (level scheme exists),
 * every `id` must be unique, and `minMastery` values must be non-decreasing so
 * `projectDisplayLevel` can map monotonically. Empty arrays, duplicate ids,
 * and descending minMastery are all rejected at validation time so the
 * invariant cannot slip downstream.
 */
export const displayLevelSchema = z.array(displayLevelItemSchema)
  .min(1, 'A display-level band must contain at least one level')
  .superRefine((band, ctx) => {
    const seenIds = new Set<string>();
    for (let i = 0; i < band.length; i++) {
      const level = band[i]!;
      if (seenIds.has(level.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Duplicate display-level id "${level.id}" — ids must be unique within a band`,
          path: [i, 'id'],
        });
        return;
      }
      seenIds.add(level.id);

      if (i > 0) {
        const prev = band[i - 1]!;
        if (level.minMastery < prev.minMastery) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: `Display-level "${level.id}" has minMastery ${level.minMastery} which is below the previous level "${prev.id}" minMastery ${prev.minMastery} — values must be non-decreasing`,
            path: [i, 'minMastery'],
          });
          return;
        }
      }
    }
  });

export type KnowledgeState = z.infer<typeof knowledgeStateSchema>;
export type DisplayLevel = z.infer<typeof displayLevelItemSchema>;
export type DisplayLevelBand = z.infer<typeof displayLevelSchema>;

export type LevelProjectionFn = (state: KnowledgeState) => string;

/**
 * Compute the average mastery across all skills in a knowledge state.
 * Returns 0 when the state has no skills.
 */
function averageMastery(state: KnowledgeState): number {
  if (state.skills.length === 0) return 0;
  const total = state.skills.reduce((sum, s) => sum + s.mastery, 0);
  return total / state.skills.length;
}

/**
 * Domain-supplied monotonic function from knowledge state → display level.
 * Presentation-only; never feeds KST/SRS computation.
 *
 * Finds the highest level whose `minMastery` threshold is ≤ the average
 * mastery across all skills. Levels must be sorted by `minMastery` ascending.
 *
 * Validates `levels` against `displayLevelSchema` before indexing so the
 * function fails safely on empty arrays, duplicate ids, or non-monotonic
 * thresholds instead of relying on non-null assertions.
 *
 * @param {KnowledgeState} state - The learner's knowledge state (list of skill masteries)
 * @param {DisplayLevel[]} levels - The domain's display-level band definitions, sorted ascending
 * @returns {string} - The `id` of the matching display level
 * @throws {z.ZodError} - If `levels` is not a valid display-level band
 */
export function projectDisplayLevel(
  state: KnowledgeState,
  levels: DisplayLevel[],
): string {
  const band = displayLevelSchema.parse(levels);
  const avg = averageMastery(state);
  let result = band[0];
  for (const level of band) {
    if (avg >= level.minMastery) {
      result = level;
    }
  }
  return result.id;
}

/**
 * Visualization helper: delegates to `getKnowledgeState` without duplicating
 * threshold constants (defends A4 — no parallel threshold literals).
 *
 * Enriches each non-mastered entry with weighted readiness score and state
 * (kst-srs.v2 §5) so downstream consumers can distinguish ready, nearly_ready,
 * and blocked nodes.
 *
 * Pure, deterministic — `now` is injected by the caller.
 *
 * @param student - Student reference
 * @param evidence - Per-skill SRS evidence
 * @param graph - Knowledge space graph
 * @param now - Reference timestamp (epoch ms)
 * @param thresholds - Optional threshold overrides (defaults to MASTERY_THRESHOLDS_DEFAULT)
 * @returns Map<NodeId, KnowledgeStateEntry>
 */
export function computeNodeState(
  student: KnowledgeStateStudentRef,
  evidence: readonly KnowledgeStateEvidence[],
  graph: KnowledgeSpace,
  now: number,
  thresholds?: Partial<MasteryThresholds>,
): Map<string, KnowledgeStateEntry> {
  const state = getKnowledgeState(student, evidence, graph, now, thresholds);

  // Enrich each entry with weighted readiness
  for (const node of graph.nodes) {
    const entry = state.get(node.id);
    if (!entry) continue;

    // Mastered nodes are excluded from fringe; readiness is optional
    if (entry.state === 'mastered') continue;

    const readiness = computeWeightedReadiness(node.id, state, graph, thresholds);
    entry.readinessScore = readiness.score;
    entry.readinessState = readiness.state;
  }

  return state;
}
