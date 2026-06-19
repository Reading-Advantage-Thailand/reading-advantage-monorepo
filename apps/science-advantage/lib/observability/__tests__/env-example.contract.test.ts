/**
 * Phase 1 contract test for FR-1 (Sentry Installation + Configuration) —
 * `.env.example` documentation surface.
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-1 line 51:
 *   "Add `SENTRY_DSN` to `.env.example` (with comment:
 *    'required in production; omit in development')."
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §2 (Testing Pyramid) classifies Phase 1 as "file-exists + import contract"
 *   - §6 (Phase 1 notes) names the live-behavior throw-in-route proof as the
 *     FR-1 gate owned by Phase 9; this contract test is the Mid-Red
 *     documentation guard for the .env.example surface that the two
 *     config-file import-contract tests do not exercise.
 *
 * Intentionally red at MID handoff: `apps/science-advantage/.env.example`
 * contains no `SENTRY_DSN=` line, so this test fails until the Green role
 * lands the FR-1 documentation line. Green is the same file passing with
 * `SENTRY_DSN=` present and a "required in production" comment.
 *
 * This is the only Red-phase contract surface for Phase 1 task 5
 * (`.env.example` SENTRY_DSN entry). Tasks 1/2 (dep + pnpm install) are
 * covered indirectly by the sentry-config.contract.test.ts import path
 * (would fail at the `import '@sentry/nextjs'` statement if the dep
 * is missing). Task 6 (build green) is the closeout gate per
 * test-strategy.md §2 and §7, not a Red test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_EXAMPLE_PATH = resolve(here, '../../../.env.example');

describe('FR-1 .env.example contract for SENTRY_DSN', () => {
  const contents = readFileSync(ENV_EXAMPLE_PATH, 'utf8');
  const lines = contents.split(/\r?\n/);

  it('documents a SENTRY_DSN= entry (non-commented)', () => {
    const sentryLine = lines.find((line) => /^\s*SENTRY_DSN\s*=/.test(line));
    expect(
      sentryLine,
      `Expected a non-commented "SENTRY_DSN=" line in ${ENV_EXAMPLE_PATH}; ` +
        'spec.md FR-1 line 51 requires documenting the env var.',
    ).toBeDefined();
  });

  it('includes the spec-mandated "required in production" comment near the entry', () => {
    const sentryIndex = lines.findIndex((line) =>
      /^\s*SENTRY_DSN\s*=/.test(line),
    );

    expect(
      sentryIndex,
      `Precondition: SENTRY_DSN must be declared before its comment is checked. ` +
        `No SENTRY_DSN= line found in ${ENV_EXAMPLE_PATH}.`,
    ).toBeGreaterThanOrEqual(0);

    const windowStart = Math.max(0, sentryIndex - 3);
    const windowEnd = Math.min(lines.length, sentryIndex + 3);
    const surrounding = lines.slice(windowStart, windowEnd).join('\n');

    expect(
      surrounding,
      `Spec FR-1 line 51 requires the comment "required in production" ` +
        `within a few lines of the SENTRY_DSN= entry. Got:\n${surrounding}`,
    ).toMatch(/required in production/i);
  });
});