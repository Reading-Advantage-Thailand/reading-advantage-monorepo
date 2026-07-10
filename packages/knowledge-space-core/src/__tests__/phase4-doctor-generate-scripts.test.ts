/**
 * Phase 4 regression — measure/scripts/doctor.{sh,mjs} and generate.{sh,mjs} exist and pass
 *
 * Track 3: Edge Calibration Loop. Phase 4, Task 2.
 *
 * Per plan.md Phase 4 Task 2: "Run measure/generate.sh and
 * measure/doctor.sh; fix architectural lint." The test-strategy.md §1
 * row for Phase 4 calls for these two scripts as the manual/doctor
 * verification entry point, alongside `npm run lint` and
 * `CI=true npm run test`.
 *
 * The contract under test:
 *
 *   - `measure/scripts/doctor.sh` OR `measure/scripts/doctor.mjs` exists
 *     and exits with code 0 when invoked with no arguments.
 *   - `measure/scripts/generate.sh` OR `measure/scripts/generate.mjs`
 *     exists and exits with code 0 when invoked with no arguments.
 *
 * The scripts are the Measure-level lint/regenerate entry point: the
 * doctor script is the architectural lint (boundary rules, plan-freshness,
 * generated-doc freshness), and the generate script refreshes the
 * machine-generated facts under `measure/generated/`.
 *
 * This file is now a passing regression guard for the Phase 4 contract.
 * It does not create the scripts or modify generated documentation; it only
 * executes the existing entry points and verifies their exit codes.
 */
import { describe, it, expect } from 'vitest';
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const MEASURE_SCRIPTS_DIR = resolve(__dirname, '../../../../measure/scripts');

const DOCTOR_CANDIDATES = [
  'doctor.sh',
  'doctor.mjs',
  'doctor.js',
] as const;

const GENERATE_CANDIDATES = [
  'generate.sh',
  'generate.mjs',
  'generate.js',
] as const;

/**
 * Find the first existing file from a list of candidate filenames in the scripts directory.
 * @param {readonly string[]} candidates - Ordered list of filenames to check
 * @returns {string | null} - The full path of the first existing file, or null if none found
 */
function findExisting(candidates: readonly string[]): string | null {
  for (const name of candidates) {
    const full = resolve(MEASURE_SCRIPTS_DIR, name);
    if (existsSync(full) && statSync(full).isFile()) {
      return full;
    }
  }
  return null;
}

describe('Phase 4 — measure/scripts/doctor script exists and exits 0', () => {
  it('measure/scripts/ contains a doctor entry point (sh/mjs/js)', () => {
    const found = findExisting(DOCTOR_CANDIDATES);
    expect(found, `Expected one of ${DOCTOR_CANDIDATES.join(', ')} in measure/scripts/`).not.toBeNull();
  });

  it('the doctor script is executable (or has a runnable extension)', () => {
    const found = findExisting(DOCTOR_CANDIDATES);
    if (found === null) return; // preceding test will fail; skip the exec check
    // .mjs / .js scripts run via node. .sh scripts must be executable.
    if (found.endsWith('.sh')) {
      const st = statSync(found);
      // Owner-execute bit must be set so `bash doctor.sh` and direct
      // invocation both work.
      expect(st.mode & 0o100, `${found} must be executable (chmod +x)`).toBeGreaterThan(0);
    } else {
      expect(found.endsWith('.mjs') || found.endsWith('.js')).toBe(true);
    }
  });

  it('the doctor script exits with code 0 on a clean repository', () => {
    const found = findExisting(DOCTOR_CANDIDATES);
    if (found === null) return;
    const result = spawnSync(found, [], {
      cwd: resolve(MEASURE_SCRIPTS_DIR, '..', '..'),
      encoding: 'utf-8',
      timeout: 30_000,
    });
    expect(result.status, `doctor script exited non-zero:\n${result.stdout}\n${result.stderr}`).toBe(0);
  });
});

describe('Phase 4 — measure/scripts/generate script exists and exits 0', () => {
  it('measure/scripts/ contains a generate entry point (sh/mjs/js)', () => {
    const found = findExisting(GENERATE_CANDIDATES);
    expect(found, `Expected one of ${GENERATE_CANDIDATES.join(', ')} in measure/scripts/`).not.toBeNull();
  });

  it('the generate script is executable (or has a runnable extension)', () => {
    const found = findExisting(GENERATE_CANDIDATES);
    if (found === null) return;
    if (found.endsWith('.sh')) {
      const st = statSync(found);
      expect(st.mode & 0o100, `${found} must be executable (chmod +x)`).toBeGreaterThan(0);
    } else {
      expect(found.endsWith('.mjs') || found.endsWith('.js')).toBe(true);
    }
  });

  it('the generate script exits with code 0 on a clean repository', { timeout: 90_000 }, () => {
    const found = findExisting(GENERATE_CANDIDATES);
    if (found === null) return;
    const result = spawnSync(found, [], {
      cwd: resolve(MEASURE_SCRIPTS_DIR, '..', '..'),
      encoding: 'utf-8',
      timeout: 60_000,
    });
    expect(result.status, `generate script exited non-zero:\n${result.stdout}\n${result.stderr}`).toBe(0);
  });
});
