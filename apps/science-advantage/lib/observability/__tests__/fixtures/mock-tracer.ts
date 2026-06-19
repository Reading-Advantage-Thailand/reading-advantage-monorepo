/**
 * Phase 6 + Phase 9 shared fixture: in-memory OTel tracer.
 *
 * Strategy reference:
 *   `measure/tracks/observability_stack_20260603/test-strategy.md`
 *
 *   §3 (Shared Fixtures & Mocks) defines `mock-tracer.ts` as:
 *     "InMemorySpanExporter from `@opentelemetry/sdk-trace-base`
 *      registered via a test-only `BasicTracerProvider`. Returns
 *      recorded spans with `name`, `attributes`, `status`, `events`
 *      for assertions. Do **not** mock `@opentelemetry/api`
 *      directly — wire a real provider so
 *      `trace.getSpan(context.active())` returns a real context."
 *
 *   Re-used by:
 *     - `lib/ai/__tests__/recommendation-service.otel.test.ts`
 *       (Phase 6: FR-5 OTel span wrapping)
 *     - Phase 9 acceptance: end-to-end OTel test (call
 *       recommendation-service path → assert span recorded).
 *
 * Wiring rationale: per the strategy note, the `@opentelemetry/api`
 * `trace.*` and `context.*` surfaces must remain un-mocked so the
 * production code path is exercised end-to-end. Only the tracer
 * provider is swapped for an in-memory one; everything else uses
 * the real OTel SDK.
 */
import {
  BasicTracerProvider,
  InMemorySpanExporter,
  type ReadableSpan,
  SimpleSpanProcessor,
} from '@opentelemetry/sdk-trace-base';
import { type Tracer, trace, context } from '@opentelemetry/api';
import { AsyncLocalStorageContextManager } from '@opentelemetry/context-async-hooks';

/**
 * Lifecycle handle returned by {@link createMockTracer}.
 *
 * The handle owns one in-memory exporter + provider pair so the
 * caller can:
 *   - read finished spans (`getSpans`)
 *   - reset the exporter between assertions (`reset`)
 *   - tear the provider down at the end of the test (`shutdown`)
 *
 * The `tracer` is `trace.getTracer('science-advantage')` — the
 * same tracer name the Phase 6 implementation is expected to use
 * (per spec.md FR-5 example: `trace.getTracer('science-advantage')`).
 */
export interface MockTracerHandle {
  readonly exporter: InMemorySpanExporter;
  readonly provider: BasicTracerProvider;
  readonly tracer: Tracer;
  /** Return all spans recorded so far (already `span.end()`-ed). */
  getSpans(): ReadableSpan[];
  /** Clear the exporter's recorded spans without tearing down the provider. */
  reset(): void;
  /** Shut the provider down (flush + close). Call in `afterEach`. */
  shutdown(): Promise<void>;
}

/**
 * Create a fresh in-memory tracer and register it as the global
 * tracer provider. Subsequent calls to `trace.getTracer(name)`
 * resolve to this provider's tracer.
 *
 * Each test must call `handle.shutdown()` in its `afterEach` to
 * avoid leaking providers across tests (the OTel global tracer
 * provider is process-singleton; a stale provider would silently
 * serve stale spans to the next test).
 *
 * @returns A handle exposing the exporter (for assertions), the
 *   provider, and the `science-advantage` tracer.
 */
export function createMockTracer(): MockTracerHandle {
  const exporter = new InMemorySpanExporter();
  const provider = new BasicTracerProvider({
    spanProcessors: [new SimpleSpanProcessor(exporter)],
  });
  trace.disable();
  trace.setGlobalTracerProvider(provider);

  const ctxManager = new AsyncLocalStorageContextManager();
  ctxManager.enable();
  context.setGlobalContextManager(ctxManager);

  const tracer = trace.getTracer('science-advantage');

  return {
    exporter,
    provider,
    tracer,
    getSpans: () => exporter.getFinishedSpans(),
    reset: () => exporter.reset(),
    shutdown: async () => {
      await provider.shutdown();
    },
  };
}