// Adaptive placement contract — domain-neutral types and schemas
// Seeds initial knowledge state from probe-based placement traversal.

import { z } from 'zod';
import { CORE_ID_PATTERN } from './schemas.js';

// ---------------------------------------------------------------------------
// ProbeResult — outcome of a single probe against a knowledge-space node
// ---------------------------------------------------------------------------

export const PROBE_RESULTS = ['pass', 'fail', 'partial'] as const;

export type ProbeResult = (typeof PROBE_RESULTS)[number];

export const probeResultSchema = z.enum(PROBE_RESULTS);

// ---------------------------------------------------------------------------
// PlacementResult — one node's estimated mastery after placement
// ---------------------------------------------------------------------------

export interface PlacementResult {
  nodeId: string;
  masteryEstimate: number;
  confidence: 'low' | 'medium';
  metadata?: Record<string, unknown>;
}

export const placementResultSchema = z.object({
  nodeId: z.string().regex(
    CORE_ID_PATTERN,
    'nodeId must match the core ID pattern (dot-separated lower-kebab-case)',
  ),
  masteryEstimate: z.number().min(0).max(1),
  confidence: z.enum(['low', 'medium']),
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
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const obj = value as Record<string, unknown>;
  if (typeof obj.nodeId !== 'string' || obj.nodeId.length === 0) return false;
  if (!CORE_ID_PATTERN.test(obj.nodeId)) return false;
  if (typeof obj.masteryEstimate !== 'number') return false;
  if (obj.masteryEstimate < 0 || obj.masteryEstimate > 1) return false;
  if (obj.confidence !== 'low' && obj.confidence !== 'medium') return false;
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
  source: 'placement';
  seededAt: number;
}

export interface BuildSeedOptions {
  now?: number;
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

  for (const r of results) {
    if (r.confidence !== 'low' && r.confidence !== 'medium') {
      throw new Error(
        `Invalid confidence value: "${r.confidence}". Placement seeds must be low or medium.`,
      );
    }
    if (r.masteryEstimate < 0 || r.masteryEstimate > 1) {
      throw new Error(
        `Invalid masteryEstimate: ${r.masteryEstimate}. Must be in [0, 1].`,
      );
    }
  }

  return results.map((r) => ({
    nodeId: r.nodeId,
    masteryEstimate: r.masteryEstimate,
    confidence: r.confidence,
    source: 'placement' as const,
    seededAt: now,
  }));
}
