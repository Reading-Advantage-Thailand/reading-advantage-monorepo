// Adaptive placement contract — domain-neutral types and schemas
// Seeds initial knowledge state from probe-based placement traversal.

import { z } from "zod";
import { CORE_ID_PATTERN } from "./schemas.js";
import type { KnowledgeSpace } from "./types.js";

// ---------------------------------------------------------------------------
// ProbeResult — outcome of a single probe against a knowledge-space node
// ---------------------------------------------------------------------------

export const PROBE_RESULTS = ["pass", "fail", "partial"] as const;

export type ProbeResult = (typeof PROBE_RESULTS)[number];

export const probeResultSchema = z.enum(PROBE_RESULTS);

// ---------------------------------------------------------------------------
// PlacementResult — one node's estimated mastery after placement
// ---------------------------------------------------------------------------

export interface PlacementResult {
  nodeId: string;
  masteryEstimate: number;
  confidence: "low" | "medium" | "high";
  metadata?: Record<string, unknown>;
}

export const placementResultSchema = z.object({
  nodeId: z
    .string()
    .regex(
      CORE_ID_PATTERN,
      "nodeId must match the core ID pattern (dot-separated lower-kebab-case)",
    ),
  masteryEstimate: z.number().min(0).max(1),
  confidence: z.enum(["low", "medium", "high"]),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export const placementResultsSchema = z.array(placementResultSchema);

// ---------------------------------------------------------------------------
// isPlacementResult — runtime type guard
// ---------------------------------------------------------------------------

/**
 * Check whether a value conforms to the PlacementResult shape at runtime.
 * @param {unknown} value - The value to check
 * @returns {value is PlacementResult} - True if the value is a valid PlacementResult
 */
export function isPlacementResult(value: unknown): value is PlacementResult {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.nodeId !== "string" || obj.nodeId.length === 0) return false;
  if (!CORE_ID_PATTERN.test(obj.nodeId)) return false;
  if (typeof obj.masteryEstimate !== "number") return false;
  if (obj.masteryEstimate < 0 || obj.masteryEstimate > 1) return false;
  if (
    obj.confidence !== "low" &&
    obj.confidence !== "medium" &&
    obj.confidence !== "high"
  ) {
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// ProbeAdapter — domain-specific probe implementation
// ---------------------------------------------------------------------------

export interface ProbeAdapter {
  domain: string;
  probe(nodeId: string): ProbeResult | Promise<ProbeResult>;
}

// ---------------------------------------------------------------------------
// KnowledgeStateSeed — PlacementResult enriched with provenance metadata
// ---------------------------------------------------------------------------

export interface KnowledgeStateSeed extends PlacementResult {
  source: "placement";
  seededAt: number;
  evidenceType: "direct" | "inferred";
  initialStability: number;
  provisionalState: "mastered" | "inProgress";
  card: PlacementSeedCard;
}

/** Review-state card synthesized from placement evidence. */
export interface PlacementSeedCard {
  /** Default objective variant key. */
  variantKey: string;
  /** Placement cards immediately enter review state. */
  state: "review";
  /** Placement counts as the first evidence-bearing review. */
  reps: 1;
  /** Placement never creates a lapse. */
  lapses: 0;
  /** Deterministic placement timestamp. */
  lastReview: number;
  /** Initial due timestamp derived from stability. */
  dueDate: number;
  /** Auditable placement provenance. */
  metadata: { source: "placement"; specVersion: "3.0" };
}

/** Options controlling placement-card synthesis and hard-edge closure. */
export interface BuildSeedOptions {
  /** Placement timestamp as epoch milliseconds. */
  now?: number;
  /** Optional graph used to infer hard-edge ancestors. */
  graph?: KnowledgeSpace;
  /** Weight at or above which prerequisite closure is logically implied. */
  hardGateThreshold?: number;
  /** Placement threshold for provisional mastery. */
  masteryEnter?: number;
}

/**
 * Enrich placement results with provenance metadata to create knowledge state seeds.
 * @param {ReadonlyArray<PlacementResult>} results - Array of placement results to enrich
 * @param {BuildSeedOptions} options - Optional timestamp override
 * @returns {KnowledgeStateSeed[]} - Array of KnowledgeStateSeed objects with source and timestamp
 * @throws If any result has invalid confidence or masteryEstimate values
 */
export function buildKnowledgeStateSeed(
  results: ReadonlyArray<PlacementResult>,
  options: BuildSeedOptions = {},
): KnowledgeStateSeed[] {
  const now = options.now ?? Date.now();
  const hardGateThreshold = options.hardGateThreshold ?? 1;
  const masteryEnter = options.masteryEnter ?? 0.8;

  for (const r of results) {
    if (
      r.confidence !== "low" &&
      r.confidence !== "medium" &&
      r.confidence !== "high"
    ) {
      throw new Error(
        `Invalid confidence value: "${r.confidence}". Placement seeds must be low, medium, or high.`,
      );
    }
    if (r.masteryEstimate < 0 || r.masteryEstimate > 1) {
      throw new Error(
        `Invalid masteryEstimate: ${r.masteryEstimate}. Must be in [0, 1].`,
      );
    }
  }

  const horizons = { low: 5, medium: 15, high: 30 } as const;
  const createSeed = (
    result: PlacementResult,
    evidenceType: "direct" | "inferred",
  ): KnowledgeStateSeed => {
    const initialStability =
      horizons[result.confidence] * result.masteryEstimate;
    return {
      ...result,
      source: "placement",
      seededAt: now,
      evidenceType,
      initialStability,
      provisionalState:
        result.masteryEstimate >= masteryEnter && result.confidence !== "low"
          ? "mastered"
          : "inProgress",
      card: {
        variantKey: result.nodeId,
        state: "review",
        reps: 1,
        lapses: 0,
        lastReview: now,
        dueDate: now + initialStability * 24 * 60 * 60 * 1_000,
        metadata: { source: "placement", specVersion: "3.0" },
      },
    };
  };

  const seeds = new Map<string, KnowledgeStateSeed>();
  for (const result of results)
    seeds.set(result.nodeId, createSeed(result, "direct"));
  if (!options.graph) return [...seeds.values()];

  const hardParents = new Map<string, string[]>();
  for (const edge of options.graph.edges) {
    if (edge.type !== "prerequisite_for" || edge.weight < hardGateThreshold)
      continue;
    hardParents.set(edge.targetId, [
      ...(hardParents.get(edge.targetId) ?? []),
      edge.sourceId,
    ]);
  }
  const downgrade = (
    confidence: PlacementResult["confidence"],
  ): PlacementResult["confidence"] =>
    confidence === "high" ? "medium" : "low";

  for (const result of results) {
    const queue = (hardParents.get(result.nodeId) ?? []).map((nodeId) => ({
      nodeId,
      confidence: downgrade(result.confidence),
    }));
    const visited = new Set<string>();
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current.nodeId)) continue;
      visited.add(current.nodeId);
      if (!seeds.has(current.nodeId)) {
        seeds.set(
          current.nodeId,
          createSeed(
            {
              nodeId: current.nodeId,
              masteryEstimate: result.masteryEstimate,
              confidence: current.confidence,
            },
            "inferred",
          ),
        );
      }
      for (const parent of hardParents.get(current.nodeId) ?? []) {
        queue.push({
          nodeId: parent,
          confidence: downgrade(current.confidence),
        });
      }
    }
  }

  return [...seeds.values()];
}
