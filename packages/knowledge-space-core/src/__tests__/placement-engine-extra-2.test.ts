// Tests — Round 2: invalid probe result handling
//
// Per measure/tracks/adaptive-placement_20260521/test-strategy.md §3:
//   "Async probe support must preserve deterministic result order and
//    propagate errors."
//
// The engine in placement-engine.ts validates the value returned by
// `adapter.probe`. When the probe returns a non-canonical value (a
// string other than 'pass' / 'fail' / 'partial', or a non-string such
// as null / undefined / a number), the engine rejects with an `Error`
// containing the phrase "Invalid probe result" so callers can identify
// the offending value at a glance.
//
//   - The `validateProbeResult` helper asserts the value is one of the
//     canonical ProbeResult strings; the `computeMastery` switch maps
//     the canonical value to the mastery estimate / confidence pair.
//   - Async probes must `await` before reaching `validateProbeResult`,
//     so a non-canonical value resolves to a rejection (not a TypeError).
//
// These tests pin down the surface behavior: any non-canonical probe
// result must surface a clear, named error (or at minimum, an error
// message containing "Invalid probe result" plus the offending value)
// so callers (placement-flow.ts, IM3 wiring) can distinguish a
// probe-side bug from an engine bug. The async rejection propagation
// test locks in the correct behavior so a future refactor cannot
// silently swallow rejections.

import { describe, it, expect } from 'vitest';
import { runPlacementTraversal } from '../placement-engine.js';
import type { KnowledgeSpace, KnowledgeSpaceNode, KnowledgeSpaceEdge } from '../types.js';
import type { ProbeAdapter, ProbeResult } from '../placement.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Create a skill node for testing placement engine.
 * @param {string} id - The skill node ID
 * @returns {KnowledgeSpaceNode} - A KnowledgeSpaceNode with kind 'skill'
 */
function makeSkill(id: string): KnowledgeSpaceNode {
  return {
    id,
    kind: 'skill',
    title: id,
    domain: 'math.test.invalid-probe',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
    metadata: {},
  };
}

/**
 * Create a prerequisite edge for testing.
 * @param {string} sourceId - Source node ID
 * @param {string} targetId - Target node ID
 * @returns {KnowledgeSpaceEdge} - A prerequisite_for KnowledgeSpaceEdge
 */
function prereqEdge(sourceId: string, targetId: string): KnowledgeSpaceEdge {
  return {
    id: `${sourceId}->${targetId}`,
    type: 'prerequisite_for',
    sourceId,
    targetId,
    weight: 0.8,
    confidence: 'high',
    sourceRefs: ['synthetic'],
    reviewStatus: 'draft',
  };
}

/**
 * Build a two-node knowledge space chain for testing.
 * @returns {KnowledgeSpace} - A KnowledgeSpace with two skill nodes and one prerequisite edge
 */
function buildTwoNodeChain(): KnowledgeSpace {
  return {
    nodes: [makeSkill('math.test.invalid.a'), makeSkill('math.test.invalid.b')],
    edges: [prereqEdge('math.test.invalid.a', 'math.test.invalid.b')],
  };
}

const INVALID_PROBE_RESULT_PATTERN = /invalid probe result/i;

// ---------------------------------------------------------------------------
// Invalid sync probe result — engine should surface a clear error
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — invalid sync probe result (Red)', () => {
  it('rejects with "invalid probe result" when the probe returns a non-canonical string', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: () => 'maybe' as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });

  it('rejects with "invalid probe result" when the probe returns null', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: () => null as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });

  it('rejects with "invalid probe result" when the probe returns undefined', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: () => undefined as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });

  it('rejects with "invalid probe result" when the probe returns a number', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: () => 1 as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });

  it('rejects with "invalid probe result" when the probe returns an uppercase variant (case-sensitive)', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: () => 'PASS' as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// Invalid async probe result — engine should surface a clear error
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — invalid async probe result (Red)', () => {
  it('rejects with "invalid probe result" when an async probe resolves to a non-canonical string', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: async () => 'maybe' as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });

  it('rejects with "invalid probe result" when an async probe resolves to null', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: async () => null as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });

  it('rejects with "invalid probe result" when an async probe resolves to undefined', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: async () => undefined as unknown as ProbeResult,
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(INVALID_PROBE_RESULT_PATTERN);
  });
});

// ---------------------------------------------------------------------------
// Async probe rejection propagation — current behavior is correct; this
// test locks it in so a future refactor cannot silently swallow rejections.
// ---------------------------------------------------------------------------

describe('runPlacementTraversal — async probe rejection propagation (Green lock-in)', () => {
  it('propagates an async probe rejection to the caller with the original error message', async () => {
    const graph = buildTwoNodeChain();
    const adapter: ProbeAdapter = {
      domain: 'math.test.invalid-probe',
      probe: async () => {
        throw new Error('async backend failure');
      },
    };
    await expect(
      runPlacementTraversal(graph, adapter, {
        startNodeId: 'math.test.invalid.a',
      }),
    ).rejects.toThrow(/async backend failure/);
  });
});
