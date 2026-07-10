/**
 * Phase 2 (Track 4 next-skill-planner_20260521) — Red direct unit
 * tests for the `weaknessFit` scoring term (Track-6 stub mode).
 *
 * Per spec FR3 + kst-srs.v2 §7.2: `weaknessFit(B)` is the boost
 * applied to a node that is linked to a recently-failed area or an
 * active misconception. Track 6 (misconception-loop) provides the
 * full state machine that surfaces those links; until Track 6
 * integrates with the planner, `weaknessFit` is stubbed to return
 * 0 for every node regardless of `misconceptionLinks`. The shape
 * of `PlannerMisconceptionLink` (skillId / misconceptionId /
 * severity) is fixed in Phase 1 so the Track 6 wiring has a
 * stable contract.
 *
 * Source under test (does NOT exist at HEAD; this is the Red signal):
 *   `packages/knowledge-space-practice/src/planner/weakness-fit.ts`
 *     - `getWeaknessFit(nodeId, graph): number` (per-node oracle)
 *     - `computeWeaknessFitMap(graph): ReadonlyMap<string, number>` (bulk precompute)
 *
 * Test approach: pure unit, no I/O, no app/Convex imports, no
 * Track-6 imports. Each case uses hand-rolled `PlannerInput`
 * fixtures from `planner-fixtures.ts`. The Red failure is
 * `TypeError: getWeaknessFit is not a function` from the missing
 * module exports — not durable-record staleness.
 *
 * Determinism: fixtures are deterministic; the stub has no
 * randomness or time-dependence.
 *
 * Boundary: the test file includes a `fs`-level assertion that
 * `planner/weakness-fit.ts` does not import from `./misconception-loop`
 * (defense-in-depth — the test-strategy §4 boundary guard).
 */

import { describe, expect, it } from 'vitest';

import {
  getWeaknessFit,
  computeWeaknessFitMap,
} from '../planner/weakness-fit.js';
import {
  makePlannerChain,
  makePlannerEmpty,
  makeMisconceptionLink,
} from './planner-fixtures.js';

// ---------------------------------------------------------------------------
// Empty misconception links
// ---------------------------------------------------------------------------

describe('weaknessFit — empty misconceptionLinks (Track-6 stub returns 0)', () => {
  it('returns 0 for every node when misconceptionLinks is empty', () => {
    const graph = makePlannerChain({ length: 5 });
    for (const node of graph.nodes) {
      expect(getWeaknessFit(node.id, graph)).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Non-empty misconception links (stub mode)
// ---------------------------------------------------------------------------

describe('weaknessFit — non-empty misconceptionLinks (Track-6 stub returns 0)', () => {
  it('returns 0 for a node explicitly listed in misconceptionLinks (stub does not yet apply a boost)', () => {
    const graph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n2', 'severe')],
    };
    expect(getWeaknessFit('chain.n2', graph)).toBe(0);
  });

  it('returns 0 for nodes not listed in misconceptionLinks (no spillover)', () => {
    const graph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n1', 'minor')],
    };
    expect(getWeaknessFit('chain.n2', graph)).toBe(0);
    expect(getWeaknessFit('chain.n3', graph)).toBe(0);
  });

  it('returns 0 regardless of severity (minor and severe both stubbed to 0)', () => {
    const minorGraph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n2', 'minor')],
    };
    const severeGraph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n2', 'severe')],
    };
    expect(getWeaknessFit('chain.n2', minorGraph)).toBe(0);
    expect(getWeaknessFit('chain.n2', severeGraph)).toBe(0);
  });

  it('returns 0 for a node listed in multiple misconception links (stub is uniform)', () => {
    const graph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [
        makeMisconceptionLink('chain.n2', 'minor', 'm.A'),
        makeMisconceptionLink('chain.n2', 'severe', 'm.B'),
        makeMisconceptionLink('chain.n2', 'minor', 'm.C'),
      ],
    };
    expect(getWeaknessFit('chain.n2', graph)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Determinism and purity
// ---------------------------------------------------------------------------

describe('weaknessFit — determinism and purity (Track-6 stub)', () => {
  it('is deterministic: repeated calls with the same input return the same value', () => {
    const graph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n1', 'severe')],
    };
    const first = getWeaknessFit('chain.n1', graph);
    const second = getWeaknessFit('chain.n1', graph);
    const third = getWeaknessFit('chain.n1', graph);
    expect(first).toBe(second);
    expect(second).toBe(third);
  });

  it('does not mutate the input PlannerInput or its misconceptionLinks array', () => {
    const graph = {
      ...makePlannerChain({ length: 3 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n1', 'severe')],
    };
    const snap = JSON.stringify({
      nodes: graph.nodes,
      edges: graph.edges,
      readinessByNode: graph.readinessByNode,
      goalNodeIds: graph.goalNodeIds,
      misconceptionLinks: graph.misconceptionLinks,
    });
    getWeaknessFit('chain.n1', graph);
    computeWeaknessFitMap(graph);
    expect(
      JSON.stringify({
        nodes: graph.nodes,
        edges: graph.edges,
        readinessByNode: graph.readinessByNode,
        goalNodeIds: graph.goalNodeIds,
        misconceptionLinks: graph.misconceptionLinks,
      }),
    ).toBe(snap);
  });
});

// ---------------------------------------------------------------------------
// Empty graph / unknown node
// ---------------------------------------------------------------------------

describe('weaknessFit — empty graph and unknown node', () => {
  it('returns 0 for an unknown node id against an empty graph', () => {
    const graph = makePlannerEmpty();
    expect(getWeaknessFit('any-id', graph)).toBe(0);
  });

  it('returns 0 for an unknown node id against a non-empty graph', () => {
    const graph = makePlannerChain({ length: 3 });
    expect(getWeaknessFit('chain.does-not-exist', graph)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Bulk precompute API
// ---------------------------------------------------------------------------

describe('weaknessFit — computeWeaknessFitMap (bulk precompute)', () => {
  it('returns a map keyed by every node id in the graph', () => {
    const graph = {
      ...makePlannerChain({ length: 5 }),
      misconceptionLinks: [makeMisconceptionLink('chain.n2', 'minor')],
    };
    const map = computeWeaknessFitMap(graph);
    expect(map).toBeInstanceOf(Map);
    for (const node of graph.nodes) {
      expect(map.has(node.id)).toBe(true);
    }
  });

  it('matches the per-node oracle for every node in the graph (stub returns 0 everywhere)', () => {
    const graph = {
      ...makePlannerChain({ length: 4 }),
      misconceptionLinks: [
        makeMisconceptionLink('chain.n1', 'minor'),
        makeMisconceptionLink('chain.n3', 'severe'),
      ],
    };
    const map = computeWeaknessFitMap(graph);
    for (const node of graph.nodes) {
      expect(map.get(node.id)).toBe(getWeaknessFit(node.id, graph));
    }
  });

  it('returns a map of all zeros in stub mode (Track 6 not yet integrated)', () => {
    const graph = {
      ...makePlannerChain({ length: 4 }),
      misconceptionLinks: [
        makeMisconceptionLink('chain.n1', 'severe'),
        makeMisconceptionLink('chain.n2', 'minor'),
      ],
    };
    const map = computeWeaknessFitMap(graph);
    for (const [, v] of map) {
      expect(v).toBe(0);
    }
  });
});

// ---------------------------------------------------------------------------
// Boundary lint: weakness-fit.ts must not import from misconception-loop
// ---------------------------------------------------------------------------

describe('weaknessFit — boundary lint (no Track-6 import inside planner/weakness-fit)', () => {
  it('planner/weakness-fit.ts does not import from ./misconception-loop (defense-in-depth)', async () => {
    // Resolve the source file from this test's URL and read it via a
    // dynamic import of `node:fs` (avoids a static-import on the
    // `node` lib types, which the package tsconfig does not include).
    // This is the bounded non-fake proof from test-strategy §4 / §7:
    // the stub is a plain function-input default, not a re-exported
    // live Track-6 helper.
    const fsModule = 'node:fs';
    const urlModule = 'node:url';
    const { readFileSync } = (await import(fsModule)) as {
      readFileSync: (path: string, encoding: 'utf-8') => string;
    };
    const { fileURLToPath } = (await import(urlModule)) as {
      fileURLToPath: (url: URL | string) => string;
    };
    const sourcePath = fileURLToPath(
      new URL('../planner/weakness-fit.ts', import.meta.url),
    );
    const source = readFileSync(sourcePath, 'utf-8');
    expect(source).not.toMatch(/from\s+['"]\.\/misconception-loop['"]/);
    expect(source).not.toMatch(/from\s+['"]\.\/misconception-loop\.ts['"]/);
    // Also ban the package re-export to avoid the same coupling at a
    // higher resolution.
    expect(source).not.toMatch(/@math-platform\/knowledge-space-practice\/misconception-loop/);
  });
});
