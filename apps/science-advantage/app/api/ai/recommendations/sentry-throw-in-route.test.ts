/**
 * Phase 9 Red-phase acceptance test: FR-1 Sentry captures route-handler errors.
 *
 * Spec:  `measure/tracks/observability_stack_20260603/spec.md`
 *   - AC #9 (line 200): "Sentry test: throw in a route handler; assert
 *     Sentry receives the error."
 *   - AC #187: "Sentry captures unhandled errors in route handlers
 *     (verified by a test that throws in a route handler and asserts
 *     Sentry receives the error)."
 *
 * Plan:  `measure/tracks/observability_stack_20260603/plan.md`
 *   - Phase 9 task 1: "Sentry test: write a route handler that throws;
 *     assert Sentry's mock `captureException` is called with the right
 *     error."
 *
 * Strategy:
 *   `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §6 (Phase 9): "End-to-end Sentry test (throw in a synthetic route
 *     → assert `captureException` mock called)."
 *   - §5 (Architecture guardrails): "No direct provider SDK imports
 *     outside the adapter: routes/components import `logger`,
 *     `runWithRequestContext`, `clientLogger` only — never
 *     `@sentry/nextjs` or `@opentelemetry/api`."
 *   - §5 (Fake harnesses are forbidden for production gates) — this
 *     test invokes the real exported route handler with all external
 *     dependencies `vi.mock`-ed; the only mocked boundary is
 *     `@sentry/nextjs` itself, which is the SDK being tested.
 *
 * RED expectations at HEAD (pre-implementation):
 *   - The route handler's catch block calls `logger.error(...)` but
 *     does NOT call `Sentry.captureException(...)`. After the route
 *     throws (forced via a mocked `@reading-advantage/domain/ai`
 *     `getRecommendation` that throws), the `captureException` mock
 *     is invoked 0 times. The test fails with
 *     `expected "vi.fn()" to be called at least once`.
 *
 * GREEN expectations after the implementer wires Sentry into the route
 * catch block:
 *   - `captureException` is called exactly once per route throw.
 *   - The first arg is the thrown error (an `Error` instance with the
 *     expected message), so Sentry receives the actual exception.
 *   - The route's HTTP response status is unchanged (500) — the Sentry
 *     capture is additive, not a behavioral change.
 *
 * Choice of route handler:
 *   - `app/api/ai/recommendations/route.ts` is used because it is the
 *     largest Phase 5 route (50 lines per plan), it has a real catch
 *     block with `logger.error(...)` (so the only missing piece at
 *     HEAD is the `Sentry.captureException(...)` call), and the Phase
 *     5 test (`app/api/ai/recommendations/route.test.ts`) already
 *     covers the FR-6 wrap contract — we piggy-back on those mocks to
 *     avoid duplicating the setup.
 */
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest';
import { NextRequest } from 'next/server';

// ---------------------------------------------------------------------------
// Mock `@sentry/nextjs` — the SDK being tested.
// `vi.hoisted` ensures the mock fns are available before `vi.mock`
// (which is hoisted above imports).
// ---------------------------------------------------------------------------
const { captureExceptionMock, captureMessageMock, initMock } = vi.hoisted(
  () => ({
    captureExceptionMock: vi.fn(),
    captureMessageMock: vi.fn(),
    initMock: vi.fn(),
  }),
);

vi.mock('@sentry/nextjs', () => ({
  init: initMock,
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
}));

// ---------------------------------------------------------------------------
// Mocks for the route's external dependencies.
// Mirrors the Phase 5 route test (`app/api/ai/recommendations/route.test.ts`)
// so the route handler's runtime path is identical; the only divergence
// is the *force-throw* on `getRecommendation` (this test) vs. the
// Phase 5 force-throw (which exercised the `logger.error` line).
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
      id: 'phase9-sentry-user',
      schoolId: 'phase9-school',
      role: 'STUDENT',
    },
  })),
}));

vi.mock('@/lib/ai/recommendation-context', () => ({
  buildRecommendationContext: vi.fn(async () => ({ items: [] })),
}));

vi.mock('@/lib/ai/recommendation-service', () => ({
  generateRecommendation: vi.fn(async () => ({
    recommendation: { nextLessonId: 'x', rationale: 'y', practiceStandards: [] },
    modelUsed: 'm',
    fallbackUsed: false,
  })),
}));

vi.mock('@/lib/config/ai', () => ({
  aiConfig: {
    rateLimitWindowMs: 60_000,
    maxRequestsPerWindow: 100,
    cacheTtlMs: 60_000,
  },
}));

vi.mock('@/lib/env', () => ({
  env: {
    DEV_AUTH_ENABLED: 'false',
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: 'false',
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

// ---------------------------------------------------------------------------
// Force the route to throw by making the domain `getRecommendation`
// reject. This is the only divergence from the Phase 5 test — Phase 5
// used the same throw to exercise the catch-block log; Phase 9 uses
// it to exercise the Sentry capture path.
// ---------------------------------------------------------------------------
const PHASE9_FORCED_ERROR_MESSAGE = 'phase9-sentry-test-forced-throw';
vi.mock('@reading-advantage/domain/ai', () => ({
  getRecommendation: vi.fn(async () => {
    throw new Error(PHASE9_FORCED_ERROR_MESSAGE);
  }),
}));

// ---------------------------------------------------------------------------
// Imports AFTER mocks (vi.mock is hoisted above imports).
// ---------------------------------------------------------------------------
import { logger } from '@/lib/observability/logger';

interface RouteModule {
  POST: (request: NextRequest) => Promise<Response>;
}

let route: RouteModule;

beforeAll(async () => {
  route = (await import('./route')) as RouteModule;
});

describe('Phase 9 — FR-1 Sentry captures route-handler errors (AC #9)', () => {
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;

  beforeEach(() => {
    captureExceptionMock.mockReset();
    captureMessageMock.mockReset();
    initMock.mockReset();
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.clearAllMocks();
  });

  it('invokes Sentry.captureException with the thrown error when the recommendations route throws', async () => {
    const req = new NextRequest(
      'http://localhost/api/ai/recommendations',
      {
        method: 'POST',
        body: JSON.stringify({ attemptId: 'phase9-attempt' }),
      },
    );
    const res = await route.POST(req);

    // Regression guard: the route still returns 500 (Sentry is additive,
    // not a behavioral change — spec.md FR-1 does not mandate any
    // response-shape change).
    expect(res.status).toBe(500);

    // The forced error propagated through the catch block.
    // RED at HEAD: captureExceptionMock.calls.length === 0.
    // After FR-1 catch-block wiring: captureExceptionMock.calls.length === 1.
    expect(
      captureExceptionMock.mock.calls.length,
      'expected Sentry.captureException to be called exactly once when ' +
        'the route handler throws. The current implementation logs the ' +
        'error via `logger.error(...)` but does not forward it to ' +
        'Sentry, so production errors would not appear in the Sentry ' +
        'dashboard. Verify the route catch block calls ' +
        '`Sentry.captureException(error)` per spec.md AC #9.',
    ).toBe(1);

    // The captured arg is the actual error (not a stringified version).
    const captured = captureExceptionMock.mock.calls[0]?.[0];
    expect(
      captured,
      'expected the first arg to Sentry.captureException to be the ' +
        'thrown error instance.',
    ).toBeInstanceOf(Error);
    expect((captured as Error).message).toBe(PHASE9_FORCED_ERROR_MESSAGE);
  });

  it('does not call Sentry.captureMessage (only captureException is the route-side API per FR-1)', async () => {
    const req = new NextRequest(
      'http://localhost/api/ai/recommendations',
      {
        method: 'POST',
        body: JSON.stringify({ attemptId: 'phase9-attempt-capture-message' }),
      },
    );
    await route.POST(req);

    // `captureMessage` is the Sentry SDK's "send a breadcrumb-style
    // string" API; the route handler must use `captureException` for
    // errors (per spec.md AC #9 "Sentry receives the error").
    // Regression guard: a future change that swaps the call site to
    // `captureMessage` would lose the error stack trace.
    expect(captureMessageMock).not.toHaveBeenCalled();
  });

  it('still emits the structured-logger error line (logger.error is not replaced by Sentry)', async () => {
    const req = new NextRequest(
      'http://localhost/api/ai/recommendations',
      {
        method: 'POST',
        body: JSON.stringify({ attemptId: 'phase9-attempt-logger-coexist' }),
      },
    );
    await route.POST(req);

    // The Phase 5 contract (`logger.error('ai.recommendation.error', ...)`
    // emits a JSON line carrying ctx) must remain in place — Sentry is
    // an additive capture, not a replacement. This regression guard
    // catches a future change that drops the structured-log line in
    // favor of Sentry alone (which would break the Track 4 audit log
    // coupling per Phase 0 coordination note).
    expect(logger.error).toBeDefined();
    const errorCalls = errorSpy.mock.calls
      .map((args) => args.find((a) => typeof a === 'string'))
      .filter((s): s is string => typeof s === 'string');
    const parsed = errorCalls
      .map((s) => {
        try {
          return JSON.parse(s) as Record<string, unknown>;
        } catch {
          return null;
        }
      })
      .filter((p): p is Record<string, unknown> => p !== null);
    const aiRecError = parsed.find(
      (p) => p['event'] === 'ai.recommendation.error',
    );
    expect(
      aiRecError,
      'expected the structured logger to still emit ' +
        '`ai.recommendation.error` after Sentry is wired (logger is ' +
        'additive per Phase 0 coordination with Track 4 audit log).',
    ).toBeDefined();
  });
});
