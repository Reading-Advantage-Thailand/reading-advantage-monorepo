// Planner contract types and the priority weight Zod schema.
//
// kst-srs.v2 §7 + spec.md FR4: priority(B) = a·readiness(B) +
// b·unlockValue(B) + c·goalProximity(B) + d·weaknessFit(B), with
// configurable engine weights a, b, c, d. The weight schema is the
// runtime-parsable surface; the planner input / output types describe
// the contract between the planner and downstream consumers (e.g.,
// the `recommendedNext` field in `StudentVisualizationV1`).
//
// Phase 1 (Track 4 next-skill-planner_20260521) — Contract & Schema.
// Domain-neutral: no IM3 / BM2 imports, no Convex, no I/O. Mirrors
// `injection.ts` and `misconception-loop.ts` in this package.

import * as z from 'zod';

// ---------------------------------------------------------------------------
// 1. priorityWeights — runtime Zod schema for the a/b/c/d engine weights
// ---------------------------------------------------------------------------
//
// Each weight is a finite, non-negative number. NaN, ±Infinity, negative
// values, strings, booleans, and missing keys are all rejected. This is
// the parse-time guard for engine configuration loaded from JSON or
// the Convex settings table; the planner assumes the input has already
// been validated and never re-parses.

export const priorityWeightsSchema = z
  .object({
    a: z.number().finite().min(0),
    b: z.number().finite().min(0),
    c: z.number().finite().min(0),
    d: z.number().finite().min(0),
  })
  .strict();

export type PriorityWeights = z.infer<typeof priorityWeightsSchema>;

// ---------------------------------------------------------------------------
// 2. PriorityScore — discriminated union (ranked | unranked | mastered)
// ---------------------------------------------------------------------------
//
// The planner emits exactly one PriorityScore per candidate node:
//   - `ranked`   — composite score + per-term breakdown; this is the
//                  term the ranker sorts on.
//   - `unranked` — node exists in the graph but cannot be ranked (e.g.,
//                  blocked by unmet prerequisites, missing readiness
//                  data). The `reason` string is opaque to the planner
//                  and is surfaced verbatim in teacher visualizations.
//   - `mastered` — node is already at the mastery threshold; emitted
//                  for completeness so the caller can distinguish
//                  "not in queue" from "in queue at the bottom".

export interface PriorityScoreTerms {
  readonly readiness: number;
  readonly unlockValue: number;
  readonly goalProximity: number;
  readonly weaknessFit: number;
}

export type PriorityScore =
  | {
      readonly kind: 'ranked';
      readonly nodeId: string;
      readonly composite: number;
      readonly terms: PriorityScoreTerms;
    }
  | {
      readonly kind: 'unranked';
      readonly nodeId: string;
      readonly reason: string;
    }
  | {
      readonly kind: 'mastered';
      readonly nodeId: string;
    };

// ---------------------------------------------------------------------------
// 3. Planner input views — domain-neutral subset of the knowledge graph
// ---------------------------------------------------------------------------
//
// The planner does not import the full `KnowledgeSpaceNode` /
// `KnowledgeSpaceEdge` from `@reading-advantage/knowledge-space-core`
// (avoids tight coupling to the canonical graph types). Callers project
// only the fields the planner actually reads. The field shape mirrors
// the canonical types so a `pick(id, kind, title, domain)` is enough.

export interface PlannerNodeView {
  readonly id: string;
  readonly kind: string;
  readonly title: string;
  readonly domain: string;
}

export interface PlannerEdgeView {
  readonly id: string;
  readonly type: string;
  readonly sourceId: string;
  readonly targetId: string;
  readonly weight: number;
}

/**
 * Misconception link consumed by the `weaknessFit` scoring term (FR3).
 * Stubbed to a zero boost in Phase 2 when `misconceptionLinks` is empty;
 * the shape is fixed in Phase 1 so the Track 6 integration has a
 * stable contract.
 */
export interface PlannerMisconceptionLink {
  readonly skillId: string;
  readonly misconceptionId: string;
  readonly severity: 'minor' | 'severe';
}

// ---------------------------------------------------------------------------
// 4. Planner input / output contracts
// ---------------------------------------------------------------------------

export interface PlannerInput {
  readonly nodes: readonly PlannerNodeView[];
  readonly edges: readonly PlannerEdgeView[];
  readonly readinessByNode: Readonly<Record<string, number>>;
  readonly goalNodeIds: readonly string[];
  readonly misconceptionLinks: readonly PlannerMisconceptionLink[];
}

export interface PlannerOutput {
  readonly scores: readonly PriorityScore[];
  readonly recommendedNext: readonly string[];
}
