/**
 * Phase 5 Red test for FR-6 (Migrate 5 Largest `route.ts` Files).
 *
 * Target: `app/api/ai/update-mastery/route.ts` (POST handler).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-6 (lines 153-166) and `plan.md` Phase 5:
 *   - The top-level handler is wrapped in `runWithRequestContext` so any
 *     `logger.*` call from within it (including the `log` dependency
 *     passed to `recordRun`, which is `logger.info.bind(logger)`) carries
 *     the request context.
 *   - The log line is valid JSON and carries `requestId` / `route` /
 *     `method` / `latencyMs`.
 *   - The response status is unchanged from the pre-migration baseline
 *     (regression guard for the wrap; test-strategy.md §6 Phase 5).
 *
 * Test approach: mock `recordRun` to invoke the `log` dependency
 * (`logger.info.bind(logger)` per the route) with a known event from
 * inside its body. If the route is wrapped in `runWithRequestContext`
 * (post-FR-6), the captured line carries ctx. If not (HEAD), it does
 * not. This is the same wrap contract as the catch-block tests in the
 * other 4 route files — the only difference is the trigger surface
 * (the `log` dep is reached via a successful `recordRun` call rather
 * than via the catch block).
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
 *     HEAD, so the `log` dependency called from inside `recordRun` fires
 *     outside any `runWithRequestContext` scope; the captured log line
 *     will NOT carry `requestId` / `route` / `method` / `latencyMs` —
 *     the wrap contract assertion fails.
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
      id: 'phase5-mastery-user',
      schoolId: 'phase5-school',
      role: 'STUDENT',
    },
  })),
}));

vi.mock('zod', async () => {
  const actual = await vi.importActual<typeof import('zod')>('zod');
  return actual;
});

vi.mock('@/lib/ai/mastery-calculator', () => ({
  calculateMasteryUpdates: vi.fn(async () => ({})),
  buildResponseInput: vi.fn((input: unknown) => input),
}));

vi.mock('@/lib/env', () => ({
  env: {
    NEXT_PUBLIC_ENABLE_MASTERY_PIPELINE: 'false',
  },
}));

vi.mock('@/lib/observability/metrics', () => ({
  metrics: {
    increment: vi.fn(),
    observe: vi.fn(),
  },
}));

vi.mock('@reading-advantage/domain/mastery', () => ({
  recordRun: vi.fn(async ({ deps }: { deps: { log: (event: string, payload?: Record<string, unknown>) => void } }) => {
    deps.log('phase5.recordRun.invoked', { kind: 'audit' });
    return { body: { success: true }, status: 200 };
  }),
  recordRunFailure: vi.fn(async () => undefined),
  RateLimitError: class extends Error {
    retryAfter: number;
    constructor(retryAfter: number) {
      super('rate-limit');
      this.name = 'RateLimitError';
      this.retryAfter = retryAfter;
    }
  },
}));

interface RouteModule {
  POST: (request: NextRequest) => Promise<Response>;
}

let route: RouteModule;

beforeAll(async () => {
  route = (await import(ROUTE_PATH)) as RouteModule;
});

describe('FR-6 update-mastery route (POST) — wrap propagates ctx into the `log` dep', () => {
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
    vi.setSystemTime(1_700_000_003_000);
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.useRealTimers();
    vi.clearAllMocks();
  });

  it('emits a JSON log line carrying `requestId` / `route` / `method` / `latencyMs` from inside the `log` dep', async () => {
    const req = new NextRequest('http://localhost/api/ai/update-mastery', {
      method: 'POST',
      body: JSON.stringify({ attemptId: 'a-1' }),
    });
    const res = await route.POST(req);

    expect(res.status).toBe(200);

    const allParsed = findJsonLogStrings([
      ...infoSpy.mock.calls,
      ...warnSpy.mock.calls,
      ...errorSpy.mock.calls,
    ]);
    const withCtx = allParsed.find((p) => p.event === 'phase5.recordRun.invoked');
    expect(withCtx, 'expected the `log` dep to emit a JSON line carrying ctx').toBeDefined();
    expect(withCtx!.requestId).toMatch(/\S+/);
    expect(withCtx!.userId).toBe('phase5-mastery-user');
    expect(withCtx!.route).toContain('/api/ai/update-mastery');
    expect(withCtx!.method).toBe('POST');
    expect(typeof withCtx!.latencyMs).toBe('number');
    expect(withCtx!.latencyMs as number).toBeGreaterThanOrEqual(0);
  });
});

describe('FR-6 update-mastery route — observability modules are wired (sanity)', () => {
  it('exposes a `logger` with `info` from the observability logger module', async () => {
    const mod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    expect(typeof mod.logger.info).toBe('function');
  });

  it('exposes `runWithRequestContext` from the observability context module', async () => {
    const mod = (await import(CONTEXT_MODULE_PATH)) as RequestContextModule;
    expect(typeof mod.runWithRequestContext).toBe('function');
  });
});
