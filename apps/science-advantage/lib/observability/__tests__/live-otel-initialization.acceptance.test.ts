// @vitest-environment node
/**
 * Phase 9 live-path Red test: FR-2 OpenTelemetry instrumentation is loaded
 * by Next.js at the app root.
 *
 * Spec: `measure/tracks/observability_stack_20260603/spec.md`
 *   - AC #2 (line 193): "`@opentelemetry/api` + `@opentelemetry/sdk-node` +
 *     `@opentelemetry/exporter-trace-otlp-http` installed;
 *     `instrumentation.ts` registers the SDK."
 *   - FR-2 (line 53-67): `instrumentation.ts` exists at the app root,
 *     exports `register()`, and delegates to `instrumentation.node.ts` when
 *     `NEXT_RUNTIME === 'nodejs'`.
 *
 * Audit context (`metadata.json` deviation_notes, 2026-06-21):
 *   "Next.js never loaded the OTel instrumentation because instrumentation.ts
 *   was under lib/ instead of the app root/src."
 *
 * Test design:
 *   - One artifact assertion (`instrumentation.ts` exists at the app root).
 *   - Two live-behavior assertions: root `register()` is an async function,
 *     and calling it starts a real OTel tracer provider (not the noop
 *     provider). The live assertions fail at HEAD because the root file is
 *   missing.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { fileURLToPath } from 'url';
import { trace } from '@opentelemetry/api';

const ROOT_INSTRUMENTATION_PATH = fileURLToPath(
  new URL('../../../instrumentation.ts', import.meta.url),
);

describe('Phase 9 — FR-2 live-path OTel initialization', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NEXT_RUNTIME = 'nodejs';
    process.env.OTEL_SERVICE_NAME = 'science-advantage';
    process.env.OTEL_EXPORTER_OTLP_ENDPOINT = '';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    const provider = trace.getTracerProvider();
    const shutdown = (provider as { shutdown?: () => Promise<void> }).shutdown;
    if (typeof shutdown === 'function') {
      // Best-effort cleanup if a real provider was registered.
      shutdown().catch(() => {});
    }
    vi.resetModules();
  });

  it('instrumentation.ts exists at the Next.js-loaded app root', () => {
    expect(
      fs.existsSync(ROOT_INSTRUMENTATION_PATH),
      'Next.js only loads instrumentation.ts from the app root (or src/). The current implementation lives under lib/ and is not loaded on the live path.',
    ).toBe(true);
  });

  it('root instrumentation.ts exports register() as an async function', async () => {
    const mod = await import(ROOT_INSTRUMENTATION_PATH);

    expect(mod).toBeDefined();
    expect(typeof mod.register).toBe('function');
    expect(
      mod.register.constructor.name,
      'Next.js instrumentation contract requires `register` to be declared with `async`.',
    ).toBe('AsyncFunction');
  });

  it('register() starts a real tracer provider, not the OTel noop provider', async () => {
    const { register } = await import(ROOT_INSTRUMENTATION_PATH);
    await register();

    const provider = trace.getTracerProvider();
    const providerName = (
      provider as { constructor?: { name: string } }
    ).constructor?.name;

    expect(
      providerName,
      'register() must delegate to instrumentation.node.ts so the NodeSDK starts a real tracer provider.',
    ).not.toBe('NoopTracerProvider');
    expect(providerName).not.toBe('ProxyTracerProvider');

    const tracer = trace.getTracer('phase9-live-otel');
    const span = tracer.startSpan('live-otel-proof');
    expect(span.spanContext().traceId).not.toBe(
      '00000000000000000000000000000000',
    );
    span.end();
  });
});
