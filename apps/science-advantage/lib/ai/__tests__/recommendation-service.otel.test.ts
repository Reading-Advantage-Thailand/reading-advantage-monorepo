/**
 * Phase 6 Red-phase tests: FR-5 "Wrap `generateObject` calls in OTel spans".
 *
 * Spec:  `measure/tracks/observability_stack_20260603/spec.md` FR-5
 * Plan:  `measure/tracks/observability_stack_20260603/plan.md` Phase 6
 * Strategy:
 *   `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §6 (Phase 6 notes):
 *       "With `InMemorySpanExporter`, call the wrapped `generateObject`;
 *        assert one span with `name='ai.generateObject'`,
 *        `attributes['ai.model']`, `attributes['ai.schema']`,
 *        status=OK on happy path; status=ERROR + recorded exception
 *        on throw path. Assert the ad-hoc `traceId` field equals
 *        `span.spanContext().traceId`."
 *   - §3 (mock-tracer): wire a real OTel provider + InMemorySpanExporter;
 *     do NOT mock `@opentelemetry/api` directly.
 *
 * RED expectations at HEAD (pre-implementation):
 *   - The recommendation-service does not import `@opentelemetry/api`
 *     and does not call `tracer.startActiveSpan`. The exporter records
 *     only the test's `test-parent` span; no `ai.generateObject` span
 *     is found. The span-presence assertions fail with
 *     `expected undefined to be defined`.
 *   - The logger payloads carry `traceId: context.traceId` (the input
 *     `RecommendationContext.traceId`, set to `rec_test_phase6_input_traced`
 *     in the fixture below). The traceId assertion expects the
 *     active-span traceId; at HEAD the active-span traceId is `undefined`
 *     (no span created) so the assertion fails with
 *     `expected undefined to be '<span-trace>'`.
 *
 * GREEN expectations after the implementer lands FR-5:
 *   - A child span named `ai.generateObject` is recorded by the
 *     `InMemorySpanExporter` with attributes `ai.model` (the model
 *     passed to `client.generateObject`) and `ai.schema` (the schema's
 *     `.description`, defaulting to `'unknown'`).
 *   - On happy path the span status is `SpanStatusCode.OK (1)`.
 *   - On throw path the span status is `SpanStatusCode.ERROR (2)`
 *     and an `'exception'` event is recorded (verifying
 *     `span.recordException(err)`).
 *   - The `traceId` field in logger payloads at the four
 *     `recommendation-service.ts:65, 102, 120, 129` sites
 *     (`ai.recommendation.cache_hit` / `_secondary_model_used` /
 *     `_model_error` / `_fallback_rules`) equals the active span's
 *     `traceId`, NOT the input `context.traceId`.
 *
 * Test strategy §4 (Phase 5 ↔ Phase 6 ordering): the
 * `InMemorySpanExporter` + `BasicTracerProvider` fixture depends on
 * the OTel SDK installed in Phase 2 (commit `bcb1ffeb`); both
 * packages are already in `apps/science-advantage/node_modules/@opentelemetry/`.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Stub `AIClient` for the `RecommendationService` constructor.
// ---------------------------------------------------------------------------
// Mirrors the `AIClient` interface (packages/ai/src/types.ts) just enough
// for the assertions. The constructor-injection shape was added by the
// `ai_adapter_package_20260603` track (Phase 6 refactor) which already
// landed in commit `5acef91d`-area; the service accepts any `AIClient`
// in its constructor.

interface GenerateObjectCall {
  schema: { parse: (input: unknown) => unknown };
  prompt: string;
  model?: string;
}

class StubAIClient {
  public readonly generateObjectCalls: GenerateObjectCall[] = [];
  public readonly activeSpanIds: (string | undefined)[] = [];
  public shouldThrow = false;

  async generateObject<T>(input: GenerateObjectCall): Promise<T> {
    this.generateObjectCalls.push(input);
    const activeSpan = trace.getSpan(otelContext.active());
    this.activeSpanIds.push(activeSpan?.spanContext().spanId);
    if (this.shouldThrow) {
      throw new Error('Phase 6 RED: stub forced throw to exercise error path');
    }
    return input.schema.parse({
      recommendedLessonId: 'lesson_otel_test',
      recommendedLessonSlug: 'otel-test-lesson',
      lessonTitle: 'OTel Test Lesson',
      focusStandards: ['MS-PS1-1'],
      reasoning:
        'OTel test reasoning string of sufficient length to satisfy the recommendation schema minimum of 10 characters.',
      confidence: 'high',
      nextBestAlternatives: [],
    }) as T;
  }

  async generateImage(_input: unknown): Promise<Buffer> {
    return Buffer.alloc(0);
  }

  async generateText(_input: unknown): Promise<string> {
    return '';
  }
}

vi.mock('@reading-advantage/ai', () => ({
  MockProvider: StubAIClient,
  createTestClient: () => new StubAIClient(),
}));

// Force vitest's `vi.mock` to resolve the real `zod` module and
// re-export it as both named and `z` namespace exports. Same
// workaround as `app/api/ai/update-mastery/route.test.ts:138` but
// with explicit `...actual` spread + `{ default: actual }` to satisfy
// vitest's "No 'z' export is defined on the 'zod' mock" static check.
// The bun + vitest transform pipeline does not resolve the named
// `z` re-export from `zod/v3/external.js` correctly without an explicit
// `vi.mock` indirection; this pattern forces vitest to load zod
// through its own resolver.
vi.mock(import('zod'), async (importOriginal) => {
  const actual = await importOriginal<typeof import('zod')>();
  return {
    ...actual,
    z: (actual as unknown as { z?: unknown }).z ?? actual,
    default: (actual as unknown as { default?: unknown }).default ?? actual,
  };
});

// ---------------------------------------------------------------------------
// In-memory Redis replacement so the cache check is observable in unit mode.
// ---------------------------------------------------------------------------
const inMemoryRedis = new Map<string, { value: string; expiresAt: number }>();
function clearInMemoryRedis(): void {
  inMemoryRedis.clear();
}
vi.mock('@/lib/platform/redis-client', () => ({
  getRedisClient: () => ({
    get: async (key: string) => inMemoryRedis.get(key)?.value ?? null,
    set: async (key: string, value: string, ttlMs: number) => {
      inMemoryRedis.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    del: async (key: string) => inMemoryRedis.delete(key),
    keys: async (pattern: string) =>
      Array.from(inMemoryRedis.keys()).filter((k) =>
        k.startsWith(pattern.replace('*', '')),
      ),
  }),
}));

// ---------------------------------------------------------------------------
// Imports AFTER the mocks are registered (vi.mock is hoisted above imports).
// ---------------------------------------------------------------------------
import { SpanStatusCode, context as otelContext, trace } from '@opentelemetry/api';

import { runWithRequestContext } from '@/lib/observability/context';
import {
  FIXTURE_STARTED_AT_MS,
  makeRequestContext,
} from '@/lib/observability/__tests__/fixtures/make-request-context';
import {
  createMockTracer,
  type MockTracerHandle,
} from '@/lib/observability/__tests__/fixtures/mock-tracer';

import { RecommendationService } from '../recommendation-service';
import type { RecommendationContext } from '../types';

// ---------------------------------------------------------------------------
// Fixture: a deterministic `RecommendationContext` for the stub path.
// Mirrors the shape produced by `buildRecommendationContext` so the
// service can run end-to-end without a real DB.
// The `traceId` is intentionally distinct from any OTel span's traceId
// so the test's assertion "logger traceId === span traceId" can detect
// the FR-5 contract violation at HEAD (where the logger carries the
// input `context.traceId` instead of the span traceId).
// ---------------------------------------------------------------------------
const baseContext: RecommendationContext = {
  traceId: 'rec_test_phase6_input_traced',
  studentId: 'stu_phase6_test',
  studentHash: 'phase6hash0000',
  studentGrade: 5,
  standardsAlignment: 'NGSS',
  masterySnapshot: [
    {
      standardId: 'std_phase6_1',
      code: 'MS-PS1-1',
      description: 'Atoms and molecules',
      masteryLevel: 0.42,
      evidenceCount: 3,
      lastAssessedAt: '2026-05-01T00:00:00.000Z',
    },
  ],
  masteryVersion: 1714521600000,
  candidateLessons: [
    {
      id: 'lesson_phase6_1',
      slug: 'atoms-and-molecules',
      title: 'Atoms and Molecules',
      lessonType: 'LESSON',
      order: 1,
      gradeLevel: 5,
      standards: [{ id: 'std_phase6_1', code: 'MS-PS1-1' }],
      prerequisites: [],
      completed: false,
    },
  ],
  attemptSummary: {
    attemptId: 'attempt_phase6_1',
    lessonId: 'lesson_phase6_0',
    lessonSlug: 'force-basics',
    lessonTitle: 'Force Basics',
    completedAt: '2026-05-20T12:00:00.000Z',
    scorePercentage: 40,
    questionCount: 5,
    correctCount: 2,
    incorrectStandards: ['MS-PS1-1'],
  },
  curriculumTitle: 'Energy & Motion',
};

/**
 * Captures `console.{info,warn,error}` JSON lines emitted by the
 * real `@/lib/observability/logger` (Phase 4 implementation). The
 * logger writes one JSON-string arg per call (per spec.md FR-4);
 * this helper decodes each captured arg and indexes it by level.
 *
 * The Phase 4 logger test (`logger.test.ts`) and the Phase 5 route
 * tests use the same pattern; reusing it here keeps the JSON-line
 * contract exercised end-to-end (per test-strategy.md §5: "No
 * external input should enter the system without validation" +
 * "JSON line shape is a contract").
 */
interface CapturedLog {
  level: 'info' | 'warn' | 'error';
  line: Record<string, unknown>;
}
function installConsoleSpies(): {
  captured: CapturedLog[];
  restore: () => void;
} {
  const captured: CapturedLog[] = [];
  const infoSpy = vi
    .spyOn(console, 'info')
    .mockImplementation((arg: unknown) => {
      captured.push({ level: 'info', line: JSON.parse(String(arg)) });
    });
  const warnSpy = vi
    .spyOn(console, 'warn')
    .mockImplementation((arg: unknown) => {
      captured.push({ level: 'warn', line: JSON.parse(String(arg)) });
    });
  const errorSpy = vi
    .spyOn(console, 'error')
    .mockImplementation((arg: unknown) => {
      captured.push({ level: 'error', line: JSON.parse(String(arg)) });
    });
  return {
    captured,
    restore: () => {
      infoSpy.mockRestore();
      warnSpy.mockRestore();
      errorSpy.mockRestore();
    },
  };
}

// ---------------------------------------------------------------------------
// Tests.
// ---------------------------------------------------------------------------
describe('Phase 6 — FR-5 OTel span wrapping around generateObject', () => {
  let handle: MockTracerHandle;
  let consoleSpies: ReturnType<typeof installConsoleSpies>;

  beforeEach(() => {
    clearInMemoryRedis();
    handle = createMockTracer();
    consoleSpies = installConsoleSpies();
  });

  afterEach(async () => {
    consoleSpies.restore();
    await handle.shutdown();
  });

  /**
   * Wraps `fn` in a parent OTel span context so the
   * service-internal `startActiveSpan('ai.generateObject', ...)` (after
   * FR-5 lands) creates a child of `test-parent`. The parent is
   * also recorded by the exporter, which is harmless — assertions
   * filter by `name === 'ai.generateObject'`.
   */
  async function withParentSpan<T>(name: string, fn: () => Promise<T>): Promise<{
    result: T;
    parentTraceId: string;
  }> {
    const parent = handle.tracer.startSpan(name);
    const parentTraceId = parent.spanContext().traceId;
    const ctx = trace.setSpan(otelContext.active(), parent);
    try {
      const result = await otelContext.with(ctx, fn);
      return { result, parentTraceId };
    } finally {
      parent.end();
    }
  }

  it('opens an `ai.generateObject` span with `ai.model` and `ai.schema` attributes on the happy path', async () => {
    const stub = new StubAIClient();
    const service = new RecommendationService(stub as never);

    const ctx = makeRequestContext({
      requestId: '01HZ_OTEL_HAPPY',
      route: '/api/ai/recommendations',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });

    await withParentSpan('test-parent', () =>
      runWithRequestContext(ctx, () => service.getRecommendation(baseContext)),
    );

    const aiSpan = handle
      .getSpans()
      .find((s) => s.name === 'ai.generateObject');

    // RED at HEAD: the service never calls `tracer.startActiveSpan`,
    // so `aiSpan` is `undefined`. After FR-5 lands the span exists.
    expect(
      aiSpan,
      'expected an `ai.generateObject` OTel span to be recorded ' +
        'by `InMemorySpanExporter` when the service calls ' +
        '`client.generateObject`. Verify FR-5 implementation wraps ' +
        '`client.generateObject` in `tracer.startActiveSpan(\'ai.generateObject\', ...)`.',
    ).toBeDefined();

    // Attribute: ai.model === the model passed to client.generateObject.
    // aiConfig.primaryModel defaults to 'gemini-2.5-flash' (lib/env.ts:98);
    // the service should pass it via `input.model`.
    expect(aiSpan?.attributes['ai.model']).toBe('gemini-2.5-flash');

    // Attribute: ai.schema === 'unknown' (the current schema has no
    // `.description`; spec FR-5 example uses `?? 'unknown'`).
    expect(aiSpan?.attributes['ai.schema']).toBe('unknown');

    // Status === SpanStatusCode.OK on happy path.
    expect(aiSpan?.status.code).toBe(SpanStatusCode.OK);

    // The span must be active during `client.generateObject` so nested
    // telemetry inside the AI client sees `ai.generateObject` as parent.
    expect(stub.activeSpanIds).toContain(aiSpan?.spanContext().spanId);
  });

  it('sets span status=ERROR and records the exception on the throw path', async () => {
    const stub = new StubAIClient();
    stub.shouldThrow = true;
    const service = new RecommendationService(stub as never);

    const ctx = makeRequestContext({
      requestId: '01HZ_OTEL_THROW',
      route: '/api/ai/recommendations',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });

    await withParentSpan('test-parent', () =>
      runWithRequestContext(ctx, () => service.getRecommendation(baseContext)),
    );

    // Filter the recorded spans to those with the expected name AND
    // error status. RED at HEAD: zero matches (no span recorded).
    // After FR-5 lands: at least one match (the first model's attempt).
    const errorSpans = handle
      .getSpans()
      .filter(
        (s) =>
          s.name === 'ai.generateObject' &&
          s.status.code === SpanStatusCode.ERROR,
      );

    expect(
      errorSpans.length,
      'expected at least one `ai.generateObject` span with ' +
        'status=ERROR after `client.generateObject` threw. Verify ' +
        'FR-5 try/catch calls `span.recordException(err)` and ' +
        '`span.setStatus({ code: SpanStatusCode.ERROR, ... })`.',
    ).toBeGreaterThanOrEqual(1);

    // The first error span must record an `exception` event (verifying
    // `span.recordException(err)`).
    const firstErrorSpan = errorSpans[0];
    const exceptionEvent = firstErrorSpan.events.find(
      (e) => e.name === 'exception',
    );
    expect(
      exceptionEvent,
      'expected the error span to record an `exception` event ' +
        '(verifying `span.recordException(err)` per spec FR-5).',
    ).toBeDefined();
  });

  it('logger payloads carry `traceId` === active OTel span traceId (not the input context.traceId)', async () => {
    const stub = new StubAIClient();
    stub.shouldThrow = true;
    const service = new RecommendationService(stub as never);

    const ctx = makeRequestContext({
      requestId: '01HZ_OTEL_TRACE',
      route: '/api/ai/recommendations',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });

    const { parentTraceId } = await withParentSpan('test-parent', () =>
      runWithRequestContext(ctx, () => service.getRecommendation(baseContext)),
    );

    // The throw path fires `logger.warn('ai.recommendation.model_error', { traceId, ... })`
    // in the service's for-loop catch block. After FR-5 lands the
    // `traceId` field equals the active span traceId (the parent, since
    // the child `ai.generateObject` span has ended by the time the catch
    // block logs).
    const modelErrorLogs = consoleSpies.captured.filter(
      (l) => l.line['event'] === 'ai.recommendation.model_error',
    );
    expect(
      modelErrorLogs.length,
      'expected at least one `ai.recommendation.model_error` log ' +
        'emitted by the service catch block when `client.generateObject` throws.',
    ).toBeGreaterThanOrEqual(1);

    // The `traceId` field must equal the parent span's traceId,
    // NOT the input context's `traceId`.
    const logTraceId = modelErrorLogs[0].line['traceId'];
    expect(
      logTraceId,
      'logger `traceId` must equal the active OTel span traceId ' +
        '(per spec FR-5: replace ad-hoc `traceId: context.traceId` ' +
        'with `trace.getSpan(context.active())?.spanContext().traceId`).',
    ).toBe(parentTraceId);
    expect(logTraceId).not.toBe(baseContext.traceId);
  });

  /**
   * Adversarial: cache-hit path.
   *
   * The Phase 6 refactor only wraps `generateObject` in a span. The
   * cache-hit branch returns before `generateObject` is called and
   * logs `ai.recommendation.cache_hit` with `traceId` drawn from the
   * active OTel context (per the FR-5 "replace ad-hoc traceId" rule).
   * This test pins three things:
   *   1. `generateObject` is NOT called on a cache hit (regression
   *      guard: no span is created and no provider call is made).
   *   2. The `cache_hit` log is emitted exactly once.
   *   3. The `traceId` field on that log equals the parent OTel
   *      span's traceId, NOT the input `RecommendationContext.traceId`.
   *
   * Failure modes this catches:
   *   - Regression where a future change moves `logger.info` inside
   *     a span (which would change `trace.getSpan(active())` to a
   *     span that should not exist on the cache-hit path).
   *   - Regression where the cache-hit path re-introduces
   *     `traceId: context.traceId` (the pre-Phase-6 bug).
   *   - Regression where `generateObject` is called even on a cache
   *     hit (cost / latency bug).
   */
  it('cache-hit path logs with active-span traceId and skips generateObject', async () => {
    // Pre-populate the in-memory Redis cache so the service takes the
    // cache-hit branch. The cached payload mirrors the shape the
    // service produces on a successful generate.
    const cacheKey = (() => {
      // Mirror the service's `buildCacheKey` shape: sha256 of the
      // sorted candidate IDs + studentId + masteryVersion, first 16
      // hex chars. We don't recompute the hash; we populate the
      // redis mock with a wildcard-keyed entry and let the service
      // look it up by its own key. Simpler: spy on the cache to
      // return a hit regardless of key.
      return 'cache-key-irrelevant-for-this-test';
    })();

    // The service calls `recommendationCache.get(cacheKey)`. The
    // mock returns `null` for unknown keys. To force a hit we use
    // a key that matches: build the deterministic key the service
    // would compute for `baseContext`.
    const { createHash } = await import('crypto');
    const candidateIds = baseContext.candidateLessons
      .map((l) => l.id)
      .sort()
      .join(',');
    const keyData = `${baseContext.studentId}:${baseContext.masteryVersion}:${candidateIds}`;
    const expectedKey = createHash('sha256')
      .update(keyData)
      .digest('hex')
      .slice(0, 16);

    const cachedResult = {
      recommendation: {
        recommendedLessonId: 'lesson_cached',
        recommendedLessonSlug: 'cached-lesson',
        lessonTitle: 'Cached Lesson',
        focusStandards: ['MS-PS1-1'],
        reasoning:
          'Cached reasoning string of sufficient length to satisfy the recommendation schema minimum of 10 characters.',
        confidence: 'high' as const,
        nextBestAlternatives: [],
      },
      modelUsed: 'gemini-2.5-flash',
      fallbackUsed: false,
    };
    // The `RedisCacheAdapter` prepends `'rec:'` to every key (see
    // `lib/platform/cache-adapter.ts:35` and
    // `recommendation-service.ts:43`). The test redis mock stores
    // entries under the FULL key the adapter looks up, so we must
    // match that key here — populating the raw hash would miss.
    inMemoryRedis.set(`rec:${expectedKey}`, {
      value: JSON.stringify(cachedResult),
      expiresAt: Date.now() + 60_000,
    });

    const stub = new StubAIClient();
    const service = new RecommendationService(stub as never);

    const ctx = makeRequestContext({
      requestId: '01HZ_OTEL_CACHE',
      route: '/api/ai/recommendations',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });

    const { parentTraceId, result } = await withParentSpan(
      'test-parent',
      () =>
        runWithRequestContext(ctx, () =>
          service.getRecommendation(baseContext),
        ),
    );

    // 1. generateObject was NOT called (cache hit short-circuits).
    expect(
      stub.generateObjectCalls.length,
      'cache-hit path must not call `client.generateObject`. ' +
        'If this fires, the cache branch is broken or the test ' +
        'fixture did not match the service cache key.',
    ).toBe(0);

    // 2. The service returned the cached result.
    expect(result.recommendation.recommendedLessonId).toBe('lesson_cached');
    expect(result.modelUsed).toBe('gemini-2.5-flash');
    expect(result.fallbackUsed).toBe(false);

    // 3. Exactly one cache_hit log was emitted.
    const cacheHitLogs = consoleSpies.captured.filter(
      (l) => l.line['event'] === 'ai.recommendation.cache_hit',
    );
    expect(
      cacheHitLogs.length,
      'expected exactly one `ai.recommendation.cache_hit` log on a cache hit.',
    ).toBe(1);

    // 4. The cache_hit log's traceId equals the parent span's traceId,
    //    NOT the input context's traceId.
    const logTraceId = cacheHitLogs[0].line['traceId'];
    expect(
      logTraceId,
      'cache_hit log `traceId` must equal the active OTel span traceId ' +
        '(per spec FR-5). The cache-hit path must NOT regress to the ' +
        'pre-Phase-6 ad-hoc `context.traceId` value.',
    ).toBe(parentTraceId);
    expect(logTraceId).not.toBe(baseContext.traceId);

    // 5. No `ai.generateObject` span was created on a cache hit
    //    (regression guard: the span wrap must not fire on the
    //    cache-hit branch).
    const aiSpans = handle
      .getSpans()
      .filter((s) => s.name === 'ai.generateObject');
    expect(
      aiSpans.length,
      'cache-hit path must not record an `ai.generateObject` span.',
    ).toBe(0);
  });

  /**
   * Adversarial: multiple-model fallback.
   *
   * `modelsToTry` is `[primaryModel, secondaryModel]`. The local
   * `.env.local` happens to set both models to `'gemini-2.5-flash'`,
   * which the dedup filter collapses to a single-element array —
   * so the pre-Phase-6 test could never exercise the secondary-model
   * fallback path under this environment.
   *
   * This test mocks `@/lib/config/ai` to expose two distinct models
   * (`primary = 'gemini-2.5-flash'`, `secondary = 'gpt-5-mini'`) and
   * asserts:
   *   1. Both models are attempted when the primary throws.
   *   2. Two `ai.generateObject` error spans are recorded (one per
   *      model attempt) — the pre-Phase-6 test only used `>= 1`
   *      which would pass even if the secondary-model fallback were
   *      silently broken.
   *   3. After both fail, the service falls through to
   *      `generateFallbackRecommendation` (`fallbackUsed: true`,
   *      `modelUsed: 'rules-engine'`).
   *   4. The `fallback_rules` log carries the parent span's traceId,
   *      NOT the input `RecommendationContext.traceId`.
   *
   * The mock is scoped to this `it` block via `vi.doMock` (not the
   * file-level `vi.mock` at the top of this file) so it doesn't
   * pollute sibling tests that depend on the real `aiConfig`.
   */
  it('records a separate `ai.generateObject` span per model attempt and falls back when all fail', async () => {
    vi.doMock('@/lib/config/ai', () => ({
      aiConfig: {
        primaryModel: 'gemini-2.5-flash',
        secondaryModel: 'gpt-5-mini',
        timeoutMs: 10_000,
        cacheTtlMs: 900_000,
        hashSecret: 'science-advantage',
        maxRequestsPerWindow: 3,
        rateLimitWindowMs: 60_000,
      },
    }));
    // Re-import the service with the mocked config. `vi.doMock` is
    // NOT hoisted (unlike `vi.mock`), so the re-import sees the mock.
    const { RecommendationService: ServiceWithFallback } = await import(
      '../recommendation-service?fallback-test'
    );

    const stub = new StubAIClient();
    stub.shouldThrow = true;
    const service = new ServiceWithFallback(stub as never);

    const ctx = makeRequestContext({
      requestId: '01HZ_OTEL_FALLBACK',
      route: '/api/ai/recommendations',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });

    const { parentTraceId, result } = await withParentSpan(
      'test-parent',
      () =>
        runWithRequestContext(ctx, () =>
          service.getRecommendation(baseContext),
        ),
    );

    // Both models were attempted (primary + secondary).
    expect(
      stub.generateObjectCalls.length,
      'expected both primary and secondary models to be attempted.',
    ).toBe(2);

    // Two error spans (one per model attempt).
    const errorSpans = handle
      .getSpans()
      .filter(
        (s) =>
          s.name === 'ai.generateObject' &&
          s.status.code === SpanStatusCode.ERROR,
      );
    expect(
      errorSpans.length,
      'expected 2 `ai.generateObject` error spans (one per failed ' +
        'model attempt). The pre-Phase-6 test used `>= 1` which ' +
        'would pass even if the secondary-model fallback were ' +
        'silently broken.',
    ).toBe(2);

    // The secondary-model `model_error` log was also emitted.
    const modelErrorLogs = consoleSpies.captured.filter(
      (l) => l.line['event'] === 'ai.recommendation.model_error',
    );
    expect(
      modelErrorLogs.length,
      'expected 2 `ai.recommendation.model_error` logs (one per ' +
        'failed model attempt).',
    ).toBe(2);

    // The fallback result was used.
    expect(
      result.fallbackUsed,
      'expected `fallbackUsed: true` when all models fail.',
    ).toBe(true);
    expect(result.modelUsed).toBe('rules-engine');

    // The fallback_rules log was emitted with the parent's traceId.
    const fallbackLogs = consoleSpies.captured.filter(
      (l) => l.line['event'] === 'ai.recommendation.fallback_rules',
    );
    expect(
      fallbackLogs.length,
      'expected one `ai.recommendation.fallback_rules` log when ' +
        'all models fail.',
    ).toBe(1);
    expect(fallbackLogs[0].line['traceId']).toBe(parentTraceId);
    expect(fallbackLogs[0].line['traceId']).not.toBe(baseContext.traceId);

    // Clean up the scoped mock so it doesn't leak into sibling tests.
    vi.doUnmock('@/lib/config/ai');
    vi.resetModules();
  });

  /**
   * Adversarial: span parent-child relationship.
   *
   * The implementation uses `tracer.startActiveSpan('ai.generateObject',
   * {}, otelContext.active(), ...)`. The third argument is the parent
   * context — it must be the active context at call time so the
   * resulting span is a child of whatever span wraps the service call.
   *
   * If a future change drops the third argument (e.g., switches to
   * `tracer.startActiveSpan('ai.generateObject', cb)`), the span
   * becomes a root span instead of a child of `test-parent`. This
   * test pins the parent-child relationship.
   */
  it('records the `ai.generateObject` span as a child of the active parent context', async () => {
    const stub = new StubAIClient();
    const service = new RecommendationService(stub as never);

    const ctx = makeRequestContext({
      requestId: '01HZ_OTEL_PARENT',
      route: '/api/ai/recommendations',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });

    let parentSpanId = '';
    await withParentSpan('test-parent', () => {
      const active = trace.getSpan(otelContext.active());
      parentSpanId = active?.spanContext().spanId ?? '';
      return runWithRequestContext(ctx, () =>
        service.getRecommendation(baseContext),
      );
    });

    const aiSpan = handle
      .getSpans()
      .find((s) => s.name === 'ai.generateObject');

    expect(aiSpan, 'expected an `ai.generateObject` span.').toBeDefined();

    // In `@opentelemetry/sdk-trace-base@^2.x` the parent reference
    // lives on `parentSpanContext.spanId` (not `parentSpanId` —
    // that's the v1.x shape). If the implementation correctly
    // passes `otelContext.active()` to `startActiveSpan`, this
    // must equal the test-parent span's ID.
    expect(
      aiSpan?.parentSpanContext?.spanId,
      'expected `ai.generateObject` span\'s parentSpanContext.spanId ' +
        'to equal the test-parent spanId (proving the span is a ' +
        'child of the active context, not a root span).',
    ).toBe(parentSpanId);
  });
});