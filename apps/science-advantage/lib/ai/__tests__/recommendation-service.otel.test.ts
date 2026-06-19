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
  public shouldThrow = false;

  async generateObject<T>(input: GenerateObjectCall): Promise<T> {
    this.generateObjectCalls.push(input);
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
});