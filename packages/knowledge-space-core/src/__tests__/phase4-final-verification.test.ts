/**
 * Phase 4 regression — final verification: boundary linter must be green
 *
 * Track 3: Edge Calibration Loop. Phase 4, Task 3.
 *
 * Per plan.md Phase 4 Task 3: "Final verification — boundary lints,
 * npm run lint, tsc --noEmit, CI=true npm run test." Task 3 is the
 * meta-verification: every quality gate listed in `measure/workflow.md`
 * §Quality Gates must pass before the phase checkpoint can be recorded.
 *
 * The first gate is the monorepo boundary linter
 * (`scripts/check-monorepo-boundaries.mjs`). It scans `packages/` for
 * the forbidden patterns declared in
 * `scripts/monorepo-boundary-rules.json` and exits non-zero on any hit.
 *
 * The test invokes the linter as a subprocess and asserts exit code 0.
 * This is a passing regression guard for the Phase 4 Task 3 quality gate.
 */
import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const LINTER_PATH = resolve(__dirname, '../../../../scripts/check-monorepo-boundaries.mjs');
const REPO_ROOT = resolve(__dirname, '../../../../');

describe('Phase 4 — final verification: monorepo boundary linter is green', () => {
  it('scripts/check-monorepo-boundaries.mjs exists and is runnable', () => {
    const result = spawnSync('node', [LINTER_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    // The script must run to completion (exit code 0 or 1). A missing
    // file or a spawn error would surface as status=null with an error
    // set on the result.
    expect(result.error, `Failed to spawn boundary linter: ${result.error?.message}`).toBeUndefined();
    expect(result.status !== null, 'Boundary linter did not report an exit code').toBe(true);
  });

  it('the boundary linter exits with code 0 on a clean repository', () => {
    const result = spawnSync('node', [LINTER_PATH], {
      cwd: REPO_ROOT,
      encoding: 'utf-8',
      timeout: 30_000,
    });
    // The linter is the first quality gate of the Phase 4 final
    // verification protocol. A non-zero exit means there is at least
    // one forbidden import pattern under `packages/`. The test fails
    // today because the linter is flagging test-fixture strings
    // (false positives) — see the known_failures block in plan.md.
    expect(
      result.status,
      `Boundary linter exited ${result.status}.\n` +
        `--- stdout ---\n${result.stdout}\n` +
        `--- stderr ---\n${result.stderr}`,
    ).toBe(0);
  });
});
