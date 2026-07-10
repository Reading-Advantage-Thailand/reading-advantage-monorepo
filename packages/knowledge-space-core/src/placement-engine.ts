// Adaptive tree-walk placement engine — domain-neutral, pure.
// Walks a knowledge-space graph guided by probe outcomes:
//   pass → downstream (toward advanced skills)
//   fail / partial → upstream (toward prerequisites)

import type { KnowledgeSpace } from "./types.js";
import type {
  PlacementResult,
  ProbeAdapter,
  ProbeResult,
} from "./placement.js";
import { z } from "zod";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface PlacementEngineResult {
  results: PlacementResult[];
  probesPerformed: number;
  reason: "converged" | "max-probes" | "empty-graph" | "frontier-stalled";
  converged: boolean;
}

/** Validated options for the v3.1 adaptive frontier walk. */
export interface TraversalOptions {
  startNodeId?: string;
  maxProbes?: number;
  hardGateThreshold?: number;
  maxRepresentativesPerContentGroup?: number;
  unchangedFrontierProbeLimit?: number;
  unlockValueByNode?: Readonly<Record<string, number>>;
}

const traversalOptionsSchema = z.strictObject({
  startNodeId: z.string().min(1).optional(),
  maxProbes: z.number().finite().int().nonnegative().optional(),
  hardGateThreshold: z.number().finite().min(0).max(1).optional(),
  maxRepresentativesPerContentGroup: z
    .number()
    .finite()
    .int()
    .positive()
    .optional(),
  unchangedFrontierProbeLimit: z.number().finite().int().positive().optional(),
  unlockValueByNode: z.record(z.string(), z.number().finite()).optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Build downstream and upstream adjacency lists from prerequisite_for edges.
 * @param {KnowledgeSpace} graph - The knowledge space graph
 * @returns {{ downstream: Map<string, string[]>; upstream: Map<string, string[]>; }} Object containing downstream and upstream adjacency maps
 */
function buildAdjacency(graph: KnowledgeSpace, hardGateThreshold: number) {
  const downstream = new Map<string, string[]>();
  const upstream = new Map<string, string[]>();

  for (const edge of graph.edges) {
    if (edge.type !== "prerequisite_for" || edge.weight < hardGateThreshold)
      continue;
    const dl = downstream.get(edge.sourceId) ?? [];
    dl.push(edge.targetId);
    downstream.set(edge.sourceId, dl);

    const ul = upstream.get(edge.targetId) ?? [];
    ul.push(edge.sourceId);
    upstream.set(edge.targetId, ul);
  }

  return { downstream, upstream };
}

const VALID_PROBE_RESULTS: ReadonlySet<string> = new Set([
  "pass",
  "fail",
  "partial",
]);

/**
 * Assert that a value is a valid ProbeResult, throwing if not.
 * @param {unknown} value - The value to validate
 * @throws If the value is not a valid ProbeResult string
 */
function validateProbeResult(value: unknown): asserts value is ProbeResult {
  if (typeof value !== "string" || !VALID_PROBE_RESULTS.has(value)) {
    throw new Error(
      `Invalid probe result: ${JSON.stringify(value)}. Expected one of: pass, fail, partial.`,
    );
  }
}

/**
 * Compute mastery estimate and confidence from a probe result.
 * @param {ProbeResult} result - The probe outcome (pass, fail, or partial)
 * @returns {{ estimate: number; confidence: PlacementResult['confidence'] }} - Object with mastery estimate and confidence level
 */
function computeMastery(
  result: ProbeResult,
  highFidelity: boolean,
): {
  estimate: number;
  confidence: PlacementResult["confidence"];
} {
  switch (result) {
    case "pass":
      return { estimate: 0.85, confidence: highFidelity ? "high" : "medium" };
    case "fail":
      return { estimate: 0.15, confidence: "low" };
    case "partial":
      return { estimate: 0.4, confidence: "low" };
  }
}

/**
 * Build the final PlacementEngineResult after the traversal loop completes.
 * @param {PlacementResult[]} results - Accumulated placement results
 * @param {number} probesPerformed - Total number of probes executed
 * @param {string[]} queue - Remaining node IDs in the traversal queue
 * @param {Set<string>} visited - Set of already-visited node IDs
 * @param {number} maxProbes - The configured maximum probe count
 * @returns {PlacementEngineResult} - Final engine result with convergence status
 */
function finalizeResult(
  results: PlacementResult[],
  probesPerformed: number,
  queue: string[],
  visited: Set<string>,
  maxProbes: number,
  budgetInterrupted: boolean,
  frontierStalled: boolean,
): PlacementEngineResult {
  const hasUnvisitedInQueue = queue.some((n) => !visited.has(n));
  const reason = frontierStalled
    ? "frontier-stalled"
    : probesPerformed >= maxProbes && (hasUnvisitedInQueue || budgetInterrupted)
      ? "max-probes"
      : "converged";
  return {
    results,
    probesPerformed,
    reason,
    converged: reason === "converged",
  };
}

// ---------------------------------------------------------------------------
// runPlacementTraversal
// ---------------------------------------------------------------------------
//
// When every adapter.probe() call returns a synchronous ProbeResult, this
// function returns a plain PlacementEngineResult (not a Promise).  When any
// probe returns a Promise, it returns a Promise<PlacementEngineResult>.
// This allows callers to omit `await` for sync adapters while still
// supporting fully-async adapters.

/**
 * Run an adaptive tree-walk placement traversal on a knowledge space graph.
 * @param {KnowledgeSpace} graph - The knowledge space to traverse
 * @param {ProbeAdapter} adapter - Domain-specific probe adapter for evaluating nodes
 * @param {TraversalOptions} options - Optional start node and max probe count
 * @returns {PlacementEngineResult} - Placement results with convergence status (may be a Promise if probes are async)
 */
export function runPlacementTraversal(
  graph: KnowledgeSpace,
  adapter: ProbeAdapter,
  options: TraversalOptions = {},
): PlacementEngineResult {
  const parsedOptions = traversalOptionsSchema.parse(options);
  if (graph.nodes.length === 0) {
    return {
      results: [],
      probesPerformed: 0,
      reason: "empty-graph",
      converged: true,
    };
  }

  const maxProbes = parsedOptions.maxProbes ?? 24;
  const startNodeId = parsedOptions.startNodeId ?? graph.nodes[0]!.id;
  if (!graph.nodes.some((node) => node.id === startNodeId)) {
    throw new Error(`startNodeId is not present in the graph: ${startNodeId}`);
  }
  if (maxProbes === 0) {
    return { results: [], probesPerformed: 0, reason: 'max-probes', converged: false };
  }

  const { downstream, upstream } = buildAdjacency(
    graph,
    adapter.legacySingleProbe ? 0 : (parsedOptions.hardGateThreshold ?? 1),
  );

  const visited = new Set<string>();
  const queue: string[] = [startNodeId];
  const results: PlacementResult[] = [];
  let probesPerformed = 0;
  let budgetInterrupted = false;
  let frontierStalled = false;
  const resolved = new Set<string>();
  const maxRepresentatives =
    parsedOptions.maxRepresentativesPerContentGroup ?? 3;

  const groupFor = (nodeId: string): string => {
    const parents = graph.edges
      .filter((edge) => edge.type === "contains" && edge.targetId === nodeId)
      .map((edge) => edge.sourceId)
      .sort();
    return (
      parents.find((parentId) =>
        graph.nodes.some(
          (node) => node.id === parentId && node.kind === "content_group",
        ),
      ) ??
      parents[0] ??
      `ungrouped:${nodeId}`
    );
  };

  function processDecision(nodeId: string, probeResult: ProbeResult): void {
    const { estimate, confidence } = computeMastery(
      probeResult,
      adapter.highFidelityProbeInstrument === true,
    );
    results.push({ nodeId, masteryEstimate: estimate, confidence });
    resolved.add(nodeId);

    const neighbors =
      probeResult === "pass"
        ? (downstream.get(nodeId) ?? [])
        : (upstream.get(nodeId) ?? []);

    const selectedNeighbors = adapter.legacySingleProbe
      ? [...neighbors]
      : [...neighbors]
          .filter((neighbor) =>
            (upstream.get(neighbor) ?? []).every((parent) =>
              resolved.has(parent),
            ),
          )
          .sort(
            (a, b) =>
              (parsedOptions.unlockValueByNode?.[b] ?? 0) -
                (parsedOptions.unlockValueByNode?.[a] ?? 0) ||
              a.localeCompare(b),
          )
          .filter(
            (neighbor, _index, all) =>
              all
                .filter(
                  (candidate) => groupFor(candidate) === groupFor(neighbor),
                )
                .indexOf(neighbor) < maxRepresentatives,
          );
    for (const neighbor of selectedNeighbors) {
      if (!visited.has(neighbor)) {
        queue.push(neighbor);
      }
    }
  }

  function resolveDecision(
    nodeId: string,
  ): ProbeResult | undefined | Promise<ProbeResult | undefined> {
    const observations: ProbeResult[] = [];
    const guessFloor = adapter.guessFloor?.(nodeId) ?? 0;
    if (!Number.isFinite(guessFloor) || guessFloor < 0 || guessFloor >= 1) {
      throw new Error(`Invalid guess floor for ${nodeId}`);
    }
    const score = (result: ProbeResult): number =>
      result === "pass"
        ? 1
        : result === "partial"
          ? Math.max(0, (0.5 - guessFloor) / (1 - guessFloor))
          : 0;
    let unchangedProbes = 0;
    const decide = (): ProbeResult | undefined => {
      if (adapter.legacySingleProbe && observations.length >= 1) {
        return observations[0];
      }
      const total = observations.reduce(
        (sum, result) => sum + score(result),
        0,
      );
      if (observations.length === 2) {
        if (total >= 1.5) return "pass";
        if (total <= 0.5) return "fail";
        return undefined;
      }
      if (observations.length >= 3) return total >= 1.5 ? "pass" : "fail";
      return undefined;
    };
    const collect = ():
      | ProbeResult
      | undefined
      | Promise<ProbeResult | undefined> => {
      const resolved = decide();
      if (resolved !== undefined) return resolved;
      if (probesPerformed >= maxProbes) return undefined;

      const probeResult = adapter.probe(nodeId);
      probesPerformed++;
      unchangedProbes++;
      if (unchangedProbes >= (parsedOptions.unchangedFrontierProbeLimit ?? 4)) {
        frontierStalled = true;
        return undefined;
      }
      if (probeResult == null) validateProbeResult(probeResult);
      if (typeof (probeResult as Promise<ProbeResult>).then === "function") {
        return (probeResult as Promise<ProbeResult>).then((value) => {
          validateProbeResult(value);
          observations.push(value);
          return collect();
        });
      }
      validateProbeResult(probeResult);
      observations.push(probeResult);
      return collect();
    };
    return collect();
  }

  function run(): PlacementEngineResult {
    while (queue.length > 0 && probesPerformed < maxProbes) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const decision = resolveDecision(nodeId);
      if (
        decision &&
        typeof (decision as Promise<ProbeResult>).then === "function"
      ) {
        return (decision as Promise<ProbeResult | undefined>).then(
          (resolved) => {
            if (resolved !== undefined) processDecision(nodeId, resolved);
            return run();
          },
        ) as unknown as PlacementEngineResult;
      }
      if (decision !== undefined)
        processDecision(nodeId, decision as ProbeResult);
      else if (probesPerformed >= maxProbes) budgetInterrupted = true;
    }

    return finalizeResult(
      results,
      probesPerformed,
      queue,
      visited,
      maxProbes,
      budgetInterrupted,
      frontierStalled,
    );
  }

  try {
    return run();
  } catch (err) {
    return Promise.reject(err) as unknown as PlacementEngineResult;
  }
}
