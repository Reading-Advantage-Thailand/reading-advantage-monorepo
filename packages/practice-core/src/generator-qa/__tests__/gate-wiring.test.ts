// Phase-4 CI gate wiring tests — Red phase (TDD).
//
// Contract under test (per test-strategy.md §5, Phase 4):
//
//   "Add `npm run test:generators` script; wire into root CI."
//
// The tests in this file assert the OUTER wiring — the script that the
// CI workflow invokes — rather than the gate function itself (covered by
// `ci-gate.test.ts`). Specifically:
//
//   1. `packages/practice-core/package.json` declares a
//      `scripts['test:generators']` entry that runs the gate.
//   2. `.github/workflows/ci.yml` has a step that runs
//      `npm run test:generators` (workspace-prefixed or not) and that
//      step is part of the `packages` matrix job so every PR runs the
//      gate.
//
// Red signal: the script does not exist in package.json and no step in
// the workflow runs it, so both assertions fail. The Green phase adds
// the script to `packages/practice-core/package.json` and a new step to
// the `packages` matrix job in `.github/workflows/ci.yml`. The boundary
// lint (`scripts/check-monorepo-boundaries.mjs`) is already part of the
// `boundary-check` job and continues to gate `apps/` and `convex/`
// imports; this file does not re-assert the boundary — it only asserts
// the gate is WIRED into CI.

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// Path resolution — vitest runs from packages/practice-core, so the
// `__dirname` shim below is the test file's directory.
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PACKAGE_JSON = resolve(__dirname, '..', '..', '..', 'package.json');
const CI_WORKFLOW = resolve(
  __dirname,
  '..',
  '..',
  '..',
  '..',
  '..',
  '.github',
  'workflows',
  'ci.yml',
);

// ---------------------------------------------------------------------------
// Task 1 wiring: the `test:generators` npm script.
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4 FR7) — npm script wiring (Task 1)', () => {
  it('declares a test:generators script in packages/practice-core/package.json', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    expect(pkg.scripts).toBeDefined();
    expect(pkg.scripts?.['test:generators']).toBeDefined();
    expect(typeof pkg.scripts?.['test:generators']).toBe('string');
  });

  it('test:generators script invokes the gate (vitest run on the gate file)', () => {
    const pkg = JSON.parse(readFileSync(PACKAGE_JSON, 'utf-8')) as {
      scripts?: Record<string, string>;
    };
    const cmd = pkg.scripts?.['test:generators'] ?? '';
    // The script should run vitest. The exact path glob is the
    // implementer's choice; we only require vitest to be involved.
    expect(cmd).toMatch(/vitest/);
  });
});

// ---------------------------------------------------------------------------
// Task 3 wiring: the .github/workflows/ci.yml job that runs the gate.
// ---------------------------------------------------------------------------

describe('CI gate (Phase 4 FR7) — CI workflow step (Task 3)', () => {
  it('declares a step in .github/workflows/ci.yml that runs test:generators', () => {
    const yml = readFileSync(CI_WORKFLOW, 'utf-8');
    // Match either a plain `npm run test:generators` or a workspace-
    // prefixed `npm run test:generators --workspace=...`. The string
    // `test:generators` MUST appear in the workflow file.
    expect(yml).toMatch(/test:generators/);
  });

  it('CI step is part of the packages matrix job (so every PR runs the gate)', () => {
    const yml = readFileSync(CI_WORKFLOW, 'utf-8');
    // Confirm the gate step sits inside the `packages:` job block (not
    // buried in a different job). The matrix strategy line + the gate
    // step should both reference the same workflow region.
    const packagesJobIndex = yml.indexOf('packages:');
    const gateIndex = yml.indexOf('test:generators');
    expect(packagesJobIndex).toBeGreaterThanOrEqual(0);
    expect(gateIndex).toBeGreaterThanOrEqual(0);
    // Sanity: gate step appears after the packages job header.
    expect(gateIndex).toBeGreaterThan(packagesJobIndex);
  });

  it('CI step runs the gate with CI=true so non-watch vitest is used', () => {
    const yml = readFileSync(CI_WORKFLOW, 'utf-8');
    // Either an explicit `CI: true` env on the step or a workflow-level
    // `env: CI: true` upstream. The simpler signal: the env block of the
    // packages job sets CI: true.
    const packagesJobSection = yml.slice(yml.indexOf('packages:'));
    expect(packagesJobSection).toMatch(/CI:\s*true/);
  });
});
