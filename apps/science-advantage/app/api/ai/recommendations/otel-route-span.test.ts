/**
 * Phase 9 Red-phase acceptance test: FR-5 OTel span is recorded when a
 * route handler calls the recommendation service.
 *
 * Spec:  `measure/tracks/observability_stack_20260603/spec.md`
 *   - AC #10 (line 201): "OTel test: call `generateObject`; assert a span
 *     is created with the right attributes."
 *   - AC #186: "All `generateObject` calls wrapped in OTel spans with
 *     `ai.model` + `ai.schema` attributes."
 *
 * Plan:  `measure/tracks/observability_stack_20260603/plan.md`
 *   - Phase 9 task 2: "OTel test: write a route handler that calls
 *     `generateObject`; assert a span is created with the right
 *     attributes."
 *
 * Strategy:
 *   `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §6 (Phase 9): "End-to-end OTel test (call recommendation-service
 *     path → assert span recorded)."
 *   - §3 (mock-tracer): "Do **not** mock `@opentelemetry/api` directly
 *     — wire a real provider so `trace.getSpan(context.active())`
 *     returns a real context." (re-used via the Phase 6 fixture).
 *   - §5 (Fake harnesses are forbidden for production gates) — this
 *     test invokes the real exported route handler with all external
 *     dependencies `vi.mock`-ed (auth, session, recommendation-context,
 *     `@reading-advantage/ai` for the AIClient, and the domain
 *     `getRecommendation` is replaced with a passthrough that calls
 *     the injected `deps.generateRecommendation` directly). The OTel
 *     span is recorded by a real `BasicTracerProvider` +
 *     `InMemorySpanExporter` wired via the Phase 6 `mock-tracer`
 *     fixture.
 *
 * RED expectations at HEAD:
 *   - This is a **route-level** integration test that exercises the
 *     route → `runWithRequestContext` → domain `getRecommendation`
 *     → `RecommendationService.getRecommendation()` → AIClient path.
 *     The Phase 6 unit test (`recommendation-service.otel.test.ts`)
 *     covers the service-direct span recording; this test covers the
 *     end-to-end wiring at the route level.
 *   - At HEAD (post-Phase 6 commit `3bccadf4`) the
 *     `RecommendationService` already wraps `client.generateObject`
 *     in `tracer.startActiveSpan('ai.generateObject', ...)`, so the
 *     span-recording assertion will PASS at HEAD. The test is
 *     intentionally added as a Phase 9 acceptance gate (per
 *     test-strategy.md §6 / spec.md AC #10) — its value is as a
 *     regression guard that catches future integration breaks
 *     (e.g., if a route stops passing the recommendation service
 *     through `deps.generateRecommendation`, the span would not be
 *     recorded and this test would fail).
 *
 * GREEN expectations:
 *   - One `ai.generateObject` span recorded by the `InMemorySpanExporter`.
 *   - The span's `ai.model` attribute equals the model the
 *     `RecommendationService` passed to `client.generateObject`
 *     (the primary model from `aiConfig`, which is `'gemini-2.5-flash'`
 *     in the test env per `apps/science-advantage/lib/env.ts`).
 *   - The span's `ai.schema` attribute equals `'unknown'` (the schema
 *     has no `.description`).
 *   - The span status is `SpanStatusCode.OK (1)` on the happy path.
 *   - The route's HTTP response is 200.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { NextRequest } from 'next/server';
import { SpanStatusCode } from '@opentelemetry/api';

// ---------------------------------------------------------------------------
// Stub `AIClient` for the `RecommendationService` constructor.
// Mirrors `StubAIClient` from
// `apps/science-advantage/lib/ai/__tests__/recommendation-service.otel.test.ts`
// so the same service code path runs (returns a parseable
// recommendation; never throws).
// ---------------------------------------------------------------------------
interface GenerateObjectCall {
  schema: { parse: (input: unknown) => unknown };
  prompt: string;
  model?: string;
}

class StubAIClient {
  public readonly generateObjectCalls: GenerateObjectCall[] = [];
  async generateObject<T>(input: GenerateObjectCall): Promise<T> {
    this.generateObjectCalls.push(input);
    return input.schema.parse({
      recommendedLessonId: 'lesson_phase9_route',
      recommendedLessonSlug: 'phase9-route-span-lesson',
      lessonTitle: 'Phase 9 Route Span Lesson',
      focusStandards: ['MS-PS1-1'],
      reasoning:
        'Phase 9 route-span reasoning string of sufficient length to satisfy the recommendation schema minimum of 10 characters.',
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
  getAIClient: () => new StubAIClient(),
}));

// Force vitest to load the real `zod` module and expose both `default`
// and a `z` namespace export so the `import { z } from 'zod'` inside
// `recommendation-service.ts` resolves cleanly under the bun +
// vitest transform pipeline.
vi.mock(import('zod'), async (importOriginal) => {
  const actual = await importOriginal<typeof import('zod')>();
  return {
    ...actual,
    z: (actual as unknown as { z?: unknown }).z ?? actual,
    default: (actual as unknown as { default?: unknown }).default ?? actual,
  };
});

// ---------------------------------------------------------------------------
// In-memory Redis replacement so the recommendation cache check is
// observable in unit mode (mirrors the Phase 6 test setup).
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
// Mocks for the route's other external dependencies (mirror the Phase 5
// `app/api/ai/recommendations/route.test.ts` setup, with one key
// difference: the domain `getRecommendation` is a passthrough that
// calls the injected `deps.generateRecommendation(context)` so the
// REAL `RecommendationService` runs end-to-end).
// ---------------------------------------------------------------------------
vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@reading-advantage/auth', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@reading-advantage/auth')>();
  return {
    ...actual,
    AuthError: class extends Error {
      public readonly code = 'UNAUTHORIZED';
      constructor(message: string) {
        super(message);
        this.name = 'AuthError';
      }
    },
  };
});

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: vi.fn(async () => ({
    user: {
      id: 'phase9-otel-user',
      schoolId: 'phase9-school',
      role: 'STUDENT',
    },
  })),
}));

vi.mock('@/lib/ai/recommendation-context', () => ({
  buildRecommendationContext: vi.fn(async () => ({
    traceId: 'phase9-route-trace',
    studentId: 'stu_phase9_route',
    studentHash: 'phase9hash0000',
    studentGrade: 5,
    standardsAlignment: 'NGSS',
    masterySnapshot: [],
    masteryVersion: 1714521600000,
    candidateLessons: [
      {
        id: 'lesson_phase9_route',
        slug: 'phase9-route-span-lesson',
        title: 'Phase 9 Route Span Lesson',
        lessonType: 'LESSON',
        order: 1,
        gradeLevel: 5,
        standards: [{ id: 'std_phase9_1', code: 'MS-PS1-1' }],
        prerequisites: [],
        completed: false,
      },
    ],
    attemptSummary: {
      attemptId: 'attempt_phase9_route',
      lessonId: 'lesson_phase9_route',
      lessonSlug: 'phase9-route-span-lesson',
      lessonTitle: 'Phase 9 Route Span Lesson',
      completedAt: '2026-05-20T12:00:00.000Z',
      scorePercentage: 60,
      questionCount: 5,
      correctCount: 3,
      incorrectStandards: ['MS-PS1-1'],
    },
    curriculumTitle: 'Energy & Motion',
  })),
}));

vi.mock('@/lib/config/ai', () => ({
  aiConfig: {
    primaryModel: 'gemini-2.5-flash',
    secondaryModel: 'gemini-2.5-flash',
    timeoutMs: 10_000,
    cacheTtlMs: 900_000,
    hashSecret: 'science-advantage',
    maxRequestsPerWindow: 3,
    rateLimitWindowMs: 60_000,
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    DEV_AUTH_ENABLED: 'false',
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: 'false',
    AI_RECOMMENDER_MODEL: undefined,
  },
}));

vi.mock('@/lib/observability/metrics', () => ({
  metrics: {
    increment: vi.fn(),
    observe: vi.fn(),
  },
}));

class MockRateLimitError extends Error {
  retryAfter: number;
  constructor(retryAfter: number) {
    super('rate-limit');
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

vi.mock('@/lib/config/recommendations', () => ({
  requestSchema: {
    safeParse: vi.fn((body: unknown) => ({
      success: true,
      data: body as { attemptId: string },
    })),
  },
  recommendationCache: {
    get: vi.fn(() => undefined),
    set: vi.fn(),
    clear: vi.fn(),
  },
  rateLimitStore: {
    checkLimit: vi.fn(async () => true),
    recordFailure: vi.fn(async () => undefined),
    reset: vi.fn(),
  },
  RateLimitError: MockRateLimitError,
}));

// Passthrough: the real domain function does DB work; we replace it
// with a thin wrapper that calls `deps.generateRecommendation(context)`
// so the real `RecommendationService` runs. This is the only way to
// exercise the route → service → `tracer.startActiveSpan('ai.generateObject', ...)`
// path without a real DB.
vi.mock('@reading-advantage/domain/ai', () => ({
  getRecommendation: vi.fn(
    async ({
      deps,
      input,
    }: {
      deps: {
        assertRateLimit: (studentId: string) => Promise<void>;
        buildRecommendationContext: (input: unknown) => Promise<unknown>;
        generateRecommendation: (context: unknown) => Promise<{
          recommendation: unknown;
          modelUsed: string;
          fallbackUsed: boolean;
        }>;
      };
      input: { attemptId: string };
    }) => {
      await deps.assertRateLimit(input.attemptId);
      const context = await deps.buildRecommendationContext({
        attempt: { id: input.attemptId },
      });
      const result = await deps.generateRecommendation(context);
      return {
        recommendation: {
          success: true,
          recommendation: result.recommendation,
          model: result.modelUsed,
          fallbackUsed: result.fallbackUsed,
          traceId: (context as { traceId: string }).traceId,
          generatedAt: new Date().toISOString(),
        },
      };
    },
  ),
}));

// ---------------------------------------------------------------------------
// Imports AFTER the mocks (vi.mock is hoisted above imports).
// ---------------------------------------------------------------------------
import {
  createMockTracer,
  type MockTracerHandle,
} from '@/lib/observability/__tests__/fixtures/mock-tracer';

interface RouteModule {
  POST: (request: NextRequest) => Promise<Response>;
}

let route: RouteModule;

beforeAll(async () => {
  route = (await import('./route')) as RouteModule;
});

describe('Phase 9 — FR-5 OTel span recorded end-to-end via the recommendations route (AC #10)', () => {
  let handle: MockTracerHandle;

  beforeEach(() => {
    clearInMemoryRedis();
    handle = createMockTracer();
  });

  afterEach(async () => {
    await handle.shutdown();
  });

  it('records an `ai.generateObject` OTel span with `ai.model` and `ai.schema` attributes when the route invokes generateRecommendation', async () => {
    const req = new NextRequest(
      'http://localhost/api/ai/recommendations',
      {
        method: 'POST',
        body: JSON.stringify({ attemptId: 'phase9-otel-attempt' }),
      },
    );
    const res = await route.POST(req);

    // Regression guard: the route's HTTP response is 200 on the happy path.
    expect(
      res.status,
      'expected the route to return 200 when generateRecommendation succeeds.',
    ).toBe(200);

    const aiSpan = handle
      .getSpans()
      .find((s) => s.name === 'ai.generateObject');

    expect(
      aiSpan,
      'expected the `InMemorySpanExporter` to record an ' +
        '`ai.generateObject` OTel span when the recommendations route ' +
        'invokes `generateRecommendation` (which calls ' +
        '`client.generateObject` inside `tracer.startActiveSpan`). ' +
        'This is the route-level live-behavior proof for spec.md AC #10 ' +
        'and test-strategy.md §6 Phase 9.',
    ).toBeDefined();

    // Attribute checks (per spec.md FR-5 example + Phase 6 test).
    expect(aiSpan?.attributes['ai.model']).toBe('gemini-2.5-flash');
    expect(aiSpan?.attributes['ai.schema']).toBe('unknown');
    expect(aiSpan?.status.code).toBe(SpanStatusCode.OK);
  });
});
