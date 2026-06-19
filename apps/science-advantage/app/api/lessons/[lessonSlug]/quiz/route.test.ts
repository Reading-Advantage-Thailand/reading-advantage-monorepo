/**
 * Phase 5 Red test for FR-6 (Migrate 5 Largest `route.ts` Files).
 *
 * Target: `app/api/lessons/[lessonSlug]/quiz/route.ts` (GET handler).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-6 (lines 153-166) and `plan.md` Phase 5:
 *   - The top-level handler is wrapped in `runWithRequestContext` so any
 *     `logger.*` call from within it (including the catch block) carries
 *     the request context.
 *   - The catch block emits a `logger.error(event, { error, ... })` line
 *     on the failure path (the current source has no logger at all; the
 *     Phase 5 task 2 + 3 contract requires `console.error` /
 *     `console.log` / `console.info` to be replaced with the structured
 *     `logger.error` / `logger.info` / `logger.warn`).
 *   - The log line is valid JSON and carries `requestId` / `route` /
 *     `method` / `latencyMs`.
 *   - The response status is unchanged from the pre-migration baseline
 *     (regression guard for the wrap; test-strategy.md §6 Phase 5).
 *
 * Strategy reference:
 *   - `test-strategy.md` §6 (Phase 5): "Per-route test that invokes the
 *     handler via `route-invoker`, captures logs, asserts at least one
 *     log line has the full ctx payload. Each route test must also
 *     assert the response status is unchanged from pre-migration
 *     (regression guard for the wrap)."
 *   - `test-strategy.md` §5 (Fake harnesses are forbidden for production
 *     gates) — this test invokes the real exported handler with all
 *     external dependencies `vi.mock`-ed, and the captured log line is
 *     the real `console.{info,warn,error}` call from the real logger.
 *
 * Intentionally red at MID handoff:
 *   - The route handler is not wrapped in `runWithRequestContext` at
 *     HEAD, and the catch block has no logger call at all, so no JSON
 *     log line is emitted on the failure path — the wrap contract
 *     assertion fails.
 *
 * Green is the same command exiting 0 once FR-6 lands (test-strategy.md §7).
 */
import {
  describe,
  it,
  expect,
  beforeAll,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';
import { NextRequest } from 'next/server';

interface RequestContextModule {
  getRequestContext: () => unknown;
  runWithRequestContext: <T>(ctx: unknown, fn: () => T) => T;
}

interface LoggerModule {
  logger: {
    info: (event: string, payload?: Record<string, unknown>) => void;
    warn: (event: string, payload?: Record<string, unknown>) => void;
    error: (event: string, payload?: Record<string, unknown>) => void;
  };
}

const CONTEXT_MODULE_PATH = '@/lib/observability/context';
const LOGGER_MODULE_PATH = '@/lib/observability/logger';
const ROUTE_PATH = './route';

interface LogPayload {
  event: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  requestId?: unknown;
  route?: unknown;
  method?: unknown;
  latencyMs?: unknown;
  [key: string]: unknown;
}

function findJsonLogStrings(calls: ReadonlyArray<ReadonlyArray<unknown>>): LogPayload[] {
  const out: LogPayload[] = [];
  for (const callArgs of calls) {
    for (const arg of callArgs) {
      if (typeof arg !== 'string') continue;
      try {
        const parsed = JSON.parse(arg) as unknown;
        if (
          parsed !== null &&
          typeof parsed === 'object' &&
          !Array.isArray(parsed) &&
          typeof (parsed as { event?: unknown }).event === 'string' &&
          typeof (parsed as { level?: unknown }).level === 'string'
        ) {
          out.push(parsed as LogPayload);
        }
      } catch {
        // not a JSON string — skip
      }
    }
  }
  return out;
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => ({
    get: vi.fn(() => undefined),
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@reading-advantage/auth', () => ({
  AuthError: class extends Error {
    public readonly code = 'UNAUTHORIZED';
    constructor(message: string) {
      super(message);
      this.name = 'AuthError';
    }
  },
}));

vi.mock('@/lib/auth/session', () => ({
  getCurrentSession: vi.fn(async () => ({
    user: {
      id: 'phase5-quiz-user',
      schoolId: 'phase5-school',
      role: 'STUDENT',
    },
  })),
}));

vi.mock('@/lib/validations/api-helpers', () => ({
  parsePath: vi.fn((params: Record<string, string>) => ({ lessonSlug: params.lessonSlug })),
  parseBody: vi.fn(async () => ({})),
  ValidationError: class extends Error {
    public readonly status = 400;
    public readonly details: unknown[] = [];
    constructor() {
      super('ValidationError');
      this.name = 'ValidationError';
    }
    toJSON() {
      return { error: 'invalid_input', details: [] };
    }
  },
}));

vi.mock('@/lib/validations/quiz', () => ({
  submitQuizAttemptSchema: { _mock: true },
}));

vi.mock('@/lib/validations/params', () => ({
  lessonSlugParamSchema: { _mock: true },
}));

vi.mock('@/lib/quiz/scoring', () => ({
  gradeAnswer: vi.fn(async () => ({ correct: true })),
}));

vi.mock('@/lib/gamification/xp', () => ({
  calculateXpForQuiz: vi.fn(() => 0),
  awardXp: vi.fn(async () => undefined),
}));

vi.mock('@/lib/gamification/streak', () => ({
  updateStreakForProfile: vi.fn(async () => undefined),
}));

vi.mock('@/lib/gamification/badges', () => ({
  checkBadgeConditions: vi.fn(async () => []),
}));

vi.mock('@/lib/services/mastery/mastery-worker', () => ({
  processMasteryRun: vi.fn(async () => undefined),
}));

vi.mock('@reading-advantage/domain/quiz', () => ({
  startQuiz: vi.fn(async () => {
    throw new Error('phase5-forced-start-failure');
  }),
  submitAttempt: vi.fn(async () => {
    throw new Error('phase5-forced-submit-failure');
  }),
}));

interface RouteModule {
  GET: (request: NextRequest, ctx: { params: Promise<{ lessonSlug: string }> }) => Promise<Response>;
}

let route: RouteModule;

beforeAll(async () => {
  route = (await import(ROUTE_PATH)) as RouteModule;
});

describe('FR-6 quiz route (GET) — wrap + structured-logger catch block', () => {
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_004_000);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('emits the catch-block error log as a JSON line carrying `requestId` / `route` / `method` / `latencyMs`', async () => {
    const req = new NextRequest('http://localhost/api/lessons/ls-1/quiz', { method: 'GET' });
    const res = await route.GET(req, { params: Promise.resolve({ lessonSlug: 'ls-1' }) });

    const allParsed = findJsonLogStrings([
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]);
    const withCtx = allParsed.find((p) => typeof p.requestId === 'string');
    expect(withCtx, 'expected at least one JSON log line carrying requestId').toBeDefined();
    expect(withCtx!.requestId).toMatch(/\S+/);
    expect(withCtx!.userId).toBe('phase5-quiz-user');
    expect(withCtx!.route).toContain('/api/lessons/ls-1/quiz');
    expect(withCtx!.method).toBe('GET');
    expect(typeof withCtx!.latencyMs).toBe('number');
    expect(withCtx!.latencyMs as number).toBeGreaterThanOrEqual(0);
  });

  it('regression guard: response status is 500 (unchanged from pre-migration baseline)', async () => {
    const req = new NextRequest('http://localhost/api/lessons/ls-1/quiz', { method: 'GET' });
    const res = await route.GET(req, { params: Promise.resolve({ lessonSlug: 'ls-1' }) });

    expect(res.status).toBe(500);
  });
});

describe('FR-6 quiz route — observability modules are wired (sanity)', () => {
  it('exposes a `logger` with `error` from the observability logger module', async () => {
    const mod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    expect(typeof mod.logger.error).toBe('function');
  });

  it('exposes `runWithRequestContext` from the observability context module', async () => {
    const mod = (await import(CONTEXT_MODULE_PATH)) as RequestContextModule;
    expect(typeof mod.runWithRequestContext).toBe('function');
  });
});
