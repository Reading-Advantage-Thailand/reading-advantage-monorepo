/**
 * Phase 4 unit tests for FR-4 (Logger Auto-Attaches Context).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-4 (lines 92-127):
 *   - `lib/observability/logger.ts` reads `getRequestContext()` and
 *     includes `requestId` / `userId` / `route` / `method` / `latencyMs`
 *     in every log line emitted from inside a `runWithRequestContext`
 *     scope.
 *   - Outside a scope, the context fields are omitted.
 *   - The line is emitted via
 *     `console.{info,warn,error}(JSON.stringify(line))` — a single JSON
 *     string parseable to the structured object.
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §3 (Shared Fixtures): the strategy names a `capture-logger.ts`
 *     helper for Phases 4 / 5 / 6 / 9; this file inlines a local copy
 *     for Phase 4 to keep the MID commit surface minimal. A follow-up
 *     refactor can extract the helper when Phase 5 lands.
 *   - §4 (Cross-Phase Edge Cases): `latencyMs` clock control uses
 *     `vi.useFakeTimers()` + `vi.setSystemTime()` so the value is
 *     deterministic, not a flaky `< 1000ms` bound. The async-leakage
 *     cross-check from FR-3 is re-run here now that the logger reads
 *     the store.
 *   - §5 (Architecture Guardrails): the JSON line shape is a contract —
 *     `LogPayload = Record<string, unknown>`, no `any`, `runWithRequestContext`
 *     is the sole writer to the ALS store (so the logger only ever
 *     reads via `getRequestContext()`).
 *   - §6 (Phase 4 notes): spy on `console.{info,warn,error}`; assert
 *     the captured arg parses to JSON with expected keys; assert
 *     ctx-less call omits `requestId` / `userId`; assert ctx-wrapped
 *     call includes the full set with deterministic values.
 *   - §7 (Live-Proof Plan) designates the targeted Red command:
 *       `pnpm --filter science-advantage exec vitest run
 *        lib/observability/__tests__/logger.test.ts`
 *
 * Intentionally red at MID handoff: the implementation file
 * `lib/observability/logger.ts` does NOT call `getRequestContext()` and
 * does NOT emit `JSON.stringify(line)` (it currently passes the entry
 * object as the second arg to `console.*('[observability]', entry)`).
 * Every test in this file fails because `findJsonLogString` cannot
 * find a JSON-string argument — the expected Red. The Green / closeout
 * gate is the same command exiting 0 once FR-4 lands.
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

import {
  makeRequestContext,
  FIXTURE_STARTED_AT_MS,
} from './fixtures/make-request-context';

const LOGGER_MODULE_PATH = '../logger';
const CONTEXT_MODULE_PATH = '../context';

interface LoggerModule {
  logger: {
    info: (event: string, payload?: Record<string, unknown>) => void;
    warn: (event: string, payload?: Record<string, unknown>) => void;
    error: (event: string, payload?: Record<string, unknown>) => void;
  };
}

interface ContextModule {
  getRequestContext: () => unknown;
  runWithRequestContext: <T>(ctx: unknown, fn: () => T) => T;
}

interface LogPayload {
  event: string;
  level: 'info' | 'warn' | 'error';
  timestamp: string;
  requestId?: unknown;
  userId?: unknown;
  route?: unknown;
  method?: unknown;
  latencyMs?: unknown;
  [key: string]: unknown;
}

type ConsoleCalls = ReadonlyArray<ReadonlyArray<unknown>>;

/**
 * Walks the captured console calls and returns the first JSON-string
 * arg that parses to an object with `event` and `level`. Per FR-4 the
 * post-implementation logger must emit
 * `console.{info,warn,error}(JSON.stringify(line))` — a single JSON
 * string. The pre-FR-4 logger emits
 * `console.*('[observability]', entry)` — neither arg is a JSON string
 * (the prefix is not valid JSON, the entry is an object) — so this
 * helper returns `undefined` until the implementation lands, which is
 * what produces the Red baseline asserted below.
 */
function findJsonLogString(calls: ConsoleCalls): LogPayload | undefined {
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
          return parsed as LogPayload;
        }
      } catch {
        // Not a JSON string — skip (e.g. the pre-FR-4 `'[observability]'`
        // prefix which is not valid JSON).
      }
    }
  }
  return undefined;
}

/**
 * Filters captured console calls to JSON-string log payloads,
 * preserving emission order. Used by the async-leakage cross-check to
 * find per-event payloads when multiple sibling log calls share one spy.
 */
function collectLogPayloads(calls: ConsoleCalls): LogPayload[] {
  const out: LogPayload[] = [];
  for (const callArgs of calls) {
    const payload = findJsonLogString([callArgs]);
    if (payload) out.push(payload);
  }
  return out;
}

describe('FR-4 Logger Auto-Attaches Context — JSON line shape', () => {
  let logger: LoggerModule['logger'];
  let infoSpy: MockInstance<(typeof console)['info']>;

  beforeAll(async () => {
    const mod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    logger = mod.logger;
  });

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
  });

  it('emits the line as a single JSON string parseable to an object with `event` / `level` / `timestamp`', () => {
    logger.info('shape.event', { extra: 'value' });

    const parsed = findJsonLogString(infoSpy.mock.calls);
    expect(parsed).toBeDefined();
    expect(parsed!.event).toBe('shape.event');
    expect(parsed!.level).toBe('info');
    expect(typeof parsed!.timestamp).toBe('string');
    expect(Number.isNaN(Date.parse(parsed!.timestamp))).toBe(false);
  });

  it('preserves the caller-supplied payload (event-specific keys survive into the JSON line)', () => {
    logger.info('payload.event', { kind: 'audit', count: 7 });

    const parsed = findJsonLogString(infoSpy.mock.calls);
    expect(parsed).toBeDefined();
    expect(parsed!.kind).toBe('audit');
    expect(parsed!.count).toBe(7);
  });

  it('omits `requestId` / `userId` / `route` / `method` / `latencyMs` outside a `runWithRequestContext` scope', () => {
    logger.info('outside.event', {});

    const parsed = findJsonLogString(infoSpy.mock.calls);
    expect(parsed).toBeDefined();
    expect(parsed!.requestId).toBeUndefined();
    expect(parsed!.userId).toBeUndefined();
    expect(parsed!.route).toBeUndefined();
    expect(parsed!.method).toBeUndefined();
    expect(parsed!.latencyMs).toBeUndefined();
  });
});

describe('FR-4 Logger Auto-Attaches Context — inside runWithRequestContext', () => {
  let logger: LoggerModule['logger'];
  let context: ContextModule;
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;

  beforeAll(async () => {
    const loggerMod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    logger = loggerMod.logger;
    const contextMod = (await import(CONTEXT_MODULE_PATH)) as ContextModule;
    context = contextMod;
  });

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    vi.useRealTimers();
  });

  it('attaches `requestId`, `userId`, `route`, `method`, `latencyMs` when in a scope', () => {
    const ctx = makeRequestContext({
      requestId: 'phase4-ctx-req-1',
      userId: 'user-42',
      route: '/api/test/route',
      method: 'POST',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 123);

    context.runWithRequestContext(ctx, () => {
      logger.info('inside.event', {});
    });

    const parsed = findJsonLogString(infoSpy.mock.calls);
    expect(parsed).toBeDefined();
    expect(parsed!.requestId).toBe(ctx.requestId);
    expect(parsed!.userId).toBe(ctx.userId);
    expect(parsed!.route).toBe(ctx.route);
    expect(parsed!.method).toBe(ctx.method);
    expect(parsed!.latencyMs).toBe(123);
  });

  it('computes `latencyMs = Date.now() - ctx.startedAt` deterministically (fake-timer clock control per strategy §4)', () => {
    const ctx = makeRequestContext({ startedAt: FIXTURE_STARTED_AT_MS });

    vi.setSystemTime(ctx.startedAt + 0);
    context.runWithRequestContext(ctx, () => logger.info('t0', {}));
    const parsed0 = findJsonLogString(infoSpy.mock.calls);
    expect(parsed0).toBeDefined();
    expect(parsed0!.latencyMs).toBe(0);

    vi.setSystemTime(ctx.startedAt + 500);
    context.runWithRequestContext(ctx, () => logger.info('t500', {}));
    const allParsed = collectLogPayloads(infoSpy.mock.calls);
    const parsed500 = allParsed.find((p) => p.event === 't500');
    expect(parsed500).toBeDefined();
    expect(parsed500!.latencyMs).toBe(500);
  });

  it('attaches the full context for the `warn` level', () => {
    const ctx = makeRequestContext({
      requestId: 'phase4-warn-req',
      route: '/api/warn',
      method: 'PUT',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 9);

    context.runWithRequestContext(ctx, () => {
      logger.warn('warn.event', {});
    });

    const parsed = findJsonLogString(warnSpy.mock.calls);
    expect(parsed).toBeDefined();
    expect(parsed!.level).toBe('warn');
    expect(parsed!.requestId).toBe(ctx.requestId);
    expect(parsed!.route).toBe(ctx.route);
    expect(parsed!.method).toBe(ctx.method);
    expect(parsed!.latencyMs).toBe(9);
  });

  it('attaches the full context for the `error` level', () => {
    const ctx = makeRequestContext({
      requestId: 'phase4-err-req',
      route: '/api/err',
      method: 'DELETE',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 11);

    context.runWithRequestContext(ctx, () => {
      logger.error('error.event', {});
    });

    const parsed = findJsonLogString(errorSpy.mock.calls);
    expect(parsed).toBeDefined();
    expect(parsed!.level).toBe('error');
    expect(parsed!.requestId).toBe(ctx.requestId);
    expect(parsed!.route).toBe(ctx.route);
    expect(parsed!.method).toBe(ctx.method);
    expect(parsed!.latencyMs).toBe(11);
  });
});

describe('FR-4 Logger Auto-Attaches Context — async-leakage cross-check (FR-3 re-run)', () => {
  let logger: LoggerModule['logger'];
  let context: ContextModule;
  let infoSpy: MockInstance<(typeof console)['info']>;

  beforeAll(async () => {
    const loggerMod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    logger = loggerMod.logger;
    const contextMod = (await import(CONTEXT_MODULE_PATH)) as ContextModule;
    context = contextMod;
  });

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    infoSpy.mockRestore();
    vi.useRealTimers();
  });

  it('does not leak context between sibling `runWithRequestContext` calls (logger-side cross-check)', async () => {
    const ctxA = makeRequestContext({
      requestId: 'leak-A',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    const ctxB = makeRequestContext({
      requestId: 'leak-B',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(FIXTURE_STARTED_AT_MS + 17);

    await Promise.all([
      context.runWithRequestContext(ctxA, async () => {
        await Promise.resolve();
        await Promise.resolve();
        logger.info('sibling.A', {});
      }),
      context.runWithRequestContext(ctxB, async () => {
        await Promise.resolve();
        await Promise.resolve();
        logger.info('sibling.B', {});
      }),
    ]);

    const allParsed = collectLogPayloads(infoSpy.mock.calls);
    const parsedA = allParsed.find((p) => p.event === 'sibling.A');
    const parsedB = allParsed.find((p) => p.event === 'sibling.B');

    expect(parsedA).toBeDefined();
    expect(parsedB).toBeDefined();
    expect(parsedA!.requestId).toBe(ctxA.requestId);
    expect(parsedB!.requestId).toBe(ctxB.requestId);
    expect(parsedA!.requestId).not.toBe(parsedB!.requestId);
  });
});