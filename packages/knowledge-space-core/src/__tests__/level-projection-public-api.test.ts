// Phase 2 (Track 8 kst-lesser-holes_20260521) — Level Projection public API contract tests.
//
// kst-srs.v2 §11.2 (Level Projection):
//   "Domain-supplied monotonic function from knowledge state → display level.
//   Presentation-only; never feeds KST/SRS computation."
//
// The package's public API exposes the level-projection surface in two
// locations:
//   1. Package root re-export: @reading-advantage/knowledge-space-core
//   2. Subpath:                 @reading-advantage/knowledge-space-core/level-projection
//
// `public-api-contract.test.ts` asserts the *type contract* is reachable from
// both locations. This test file strengthens the public-API contract by
// asserting the runtime `projectDisplayLevel(state, levels) → string` function
// is exposed — not just the type — from both the root and the subpath
// entrypoints.
//
// Test count: 2 tests. Targeted command:
//   npx vitest run packages/knowledge-space-core/src/__tests__/level-projection-public-api.test.ts

import { describe, it, expect } from 'vitest';
import * as rootExports from '@reading-advantage/knowledge-space-core';
import * as subpathExports from '@reading-advantage/knowledge-space-core/level-projection';

// ---------------------------------------------------------------------------
// 1. Package root export
// ---------------------------------------------------------------------------

describe('Level Projection — public API contract: package root (kst-srs.v2 §11.2)', () => {
  it('re-exports projectDisplayLevel from @reading-advantage/knowledge-space-core', () => {
    // Re-exported by `packages/knowledge-space-core/src/index.ts` from
    // `./level-projection` as a named `projectDisplayLevel` symbol.
    const fn = (rootExports as Record<string, unknown>).projectDisplayLevel;
    expect(typeof fn).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 2. Subpath export
// ---------------------------------------------------------------------------

describe('Level Projection — public API contract: subpath (kst-srs.v2 §11.2)', () => {
  it('exports projectDisplayLevel from @reading-advantage/knowledge-space-core/level-projection', () => {
    // The subpath is wired in `package.json` exports, so the import resolves
    // directly to `./level-projection.ts`, which exports the `projectDisplayLevel`
    // function.
    const fn = (subpathExports as Record<string, unknown>).projectDisplayLevel;
    expect(typeof fn).toBe('function');
  });
});
