/**
 * Phase 2 contract test for FR-2 (OpenTelemetry Installation + Configuration) —
 * `.env.example` documentation surface.
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/plan.md`
 * Phase 2 task 5:
 *   "Add `OTEL_EXPORTER_OTLP_ENDPOINT` (optional) and `OTEL_SERVICE_NAME`
 *    to `.env.example`."
 *
 * Pinned shape from `spec.md` FR-2:
 *   - `OTEL_EXPORTER_OTLP_ENDPOINT` is optional — used to point the OTLP
 *     exporter at a collector. Local dev has no collector; the
 *     implementation falls back to a console exporter when this var is
 *     unset/empty (spec.md FR-2 line 65).
 *   - `OTEL_SERVICE_NAME` controls the `service.name` resource attribute
 *     (spec.md FR-2 line 64 — default `science-advantage`).
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §2 (Testing Pyramid) classifies Phase 2 as "file-exists + register()
 *     returns" with the closeout live-behavior proof being the build.
 *   - §5 (Architecture Guardrails) lists `.env.example` documentation as
 *     a first-class contract surface, paired with the same pattern used
 *     for Phase 1's `env-example.contract.test.ts` (SENTRY_DSN entry).
 *   - The live-behavior gate (an actual span exported with the
 *     `service.name` attribute) is owned by Phase 9 per `test-strategy.md`
 *     §6 (Phase 2 notes) and §7; this file is the documentation guard.
 *
 * Intentionally red at MID handoff:
 *   - `apps/science-advantage/.env.example` contains no `OTEL_SERVICE_NAME=`
 *     line, so the "service.name declaration" test fails until the
 *     Green role lands the FR-2 documentation.
 *   - `apps/science-advantage/.env.example` contains no
 *     `OTEL_EXPORTER_OTLP_ENDPOINT=` line (commented or otherwise), so
 *     the "OTLP endpoint declaration" test fails until the Green role
 *     lands the FR-2 documentation.
 *
 * This is the only Red-phase contract surface for Phase 2 task 5
 * (.env.example OTEL entries). Tasks 1/2 (deps + pnpm install) and
 * task 3/4 (instrumentation files) are covered by
 * `instrumentation.contract.test.ts`. Task 6 (build green) is the
 * closeout gate per `test-strategy.md` §2 and §7, not a Red test.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const ENV_EXAMPLE_PATH = resolve(here, '../../../.env.example');

describe('FR-2 .env.example contract for OTEL_*', () => {
  const contents = readFileSync(ENV_EXAMPLE_PATH, 'utf8');
  const lines = contents.split(/\r?\n/);

  it('documents a OTEL_SERVICE_NAME= entry (non-commented)', () => {
    const otelServiceNameLine = lines.find((line) =>
      /^\s*OTEL_SERVICE_NAME\s*=/.test(line),
    );
    expect(
      otelServiceNameLine,
      `Expected a non-commented "OTEL_SERVICE_NAME=" line in ${ENV_EXAMPLE_PATH}; ` +
        'plan.md Phase 2 task 5 requires documenting the env var used to set service.name.',
    ).toBeDefined();
  });

  it('documents a OTEL_EXPORTER_OTLP_ENDPOINT= entry (commented OK because the var is optional)', () => {
    const otelEndpointLine = lines.find((line) =>
      /^\s*#?\s*OTEL_EXPORTER_OTLP_ENDPOINT\s*=/.test(line),
    );
    expect(
      otelEndpointLine,
      `Expected a (possibly commented) "OTEL_EXPORTER_OTLP_ENDPOINT=" line in ${ENV_EXAMPLE_PATH}; ` +
        'plan.md Phase 2 task 5 requires documenting the optional collector endpoint env var.',
    ).toBeDefined();
  });
});
