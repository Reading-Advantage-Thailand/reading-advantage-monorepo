/**
 * Adversarial audit tests for FR-4 (Logger Auto-Attaches Context).
 *
 * These tests attempt to DISPROVE the correctness of the Phase 4
 * implementation. They probe boundary conditions, failure paths,
 * regression risks, and contract edges that the standard
 * `logger.test.ts` does not exercise. Each test is a live behavior
 * probe (not a contract mock) per test-strategy.md §5 "Fake harnesses
 * are forbidden for production gates."
 *
 * Source-of-truth references:
 *   - spec.md FR-4 (lines 92-127)
 *   - test-strategy.md §4 (Cross-Phase Edge Cases)
 *   - test-strategy.md §5 (Architecture Guardrails)
 *   - AGENTS.md §9.1, §9.2
 *
 * Adversarial surface covered:
 *   1. Resilient serialization (circular refs, BigInt) — the logger
 *      MUST NOT throw because a throw inside a route handler would
 *      crash the request and lose the audit trail. Strategy §5 forbids
 *      `any` payloads but does not pin throw-vs-degrade behavior; this
 *      audit pins a hard no-throw contract.
 *   2. JSON round-trip with adversarial requestId characters (quotes,
 *      newlines, backslashes, unicode) — the JSON line is the wire
 *      format; downstream log shippers must be able to parse it.
 *   3. Payload-key collision with context fields — a malicious payload
 *      must NOT be able to spoof `requestId`/`userId`/`route`/`method`
 *      because those fields are the correlation key.
 *   4. Payload immutability — the logger MUST NOT mutate the caller's
 *      payload object (a logger that mutates caller state is a
 *      debugging hazard and a security concern).
 *   5. Console-method dispatch — `logger.warn` MUST go to `console.warn`
 *      and NOT also fire `console.info`; the warn/error levels are
 *      the routing key for alerting.
 *   6. Call shape — the JSON line MUST be a single arg to `console.*`;
 *      the legacy `console.info('[observability]', entry)` shape must
 *      be regression-detected.
 *   7. Deterministic timestamp — under `vi.useFakeTimers()` the
 *      emitted `timestamp` MUST equal the faked wall clock, not the
 *      real one.
 *   8. Repeated emission within a single scope — every emitted line
 *      MUST carry the same `requestId`; a context-flip mid-scope is
 *      a real bug.
 *   9. Edge case `userId === ''` — the spec interface allows
 *      `userId?: string`; an empty string is a valid string and must
 *      be preserved (not omitted as if undefined).
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
  [key: string]: unknown;
}

function findJsonLogString(args: ReadonlyArray<unknown>): LogPayload | undefined {
  for (const arg of args) {
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
      // not a JSON string — skip
    }
  }
  return undefined;
}

describe('ADVERSARIAL — FR-4 resilient serialization (must not throw)', () => {
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

  it('does not throw on a circular-reference payload (request must not crash the audit trail)', () => {
    interface Circular {
      kind: string;
      self?: Circular;
    }
    const circular: Circular = { kind: 'audit' };
    circular.self = circular;

    expect(() => logger.info('circular.event', circular as unknown as Record<string, unknown>)).not.toThrow();

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect(parsed!.event).toBe('circular.event');
  });

  it('does not throw on a BigInt payload value (BigInt is valid in JS but unserializable to JSON)', () => {
    expect(() =>
      logger.info('bigint.event', { count: BigInt(100) } as unknown as Record<string, unknown>),
    ).not.toThrow();
  });
});

describe('ADVERSARIAL — FR-4 JSON round-trip with adversarial requestId', () => {
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

  it('preserves a requestId containing JSON-special characters through JSON.parse round-trip', () => {
    const adversarialRequestId = 'req-"quoted"\\back\nslash\t\u0001ctl';
    const ctx = makeRequestContext({
      requestId: adversarialRequestId,
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 1);

    context.runWithRequestContext(ctx, () => {
      logger.info('escape.event', {});
    });

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect(parsed!.requestId).toBe(adversarialRequestId);
  });
});

describe('ADVERSARIAL — FR-4 payload key collision (security regression guard)', () => {
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

  it('caller payload cannot spoof `requestId` — context value wins (correlation key must be trusted)', () => {
    const ctx = makeRequestContext({
      requestId: 'real-request-id',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 1);

    context.runWithRequestContext(ctx, () => {
      logger.info('spoof.event', { requestId: 'spoofed-by-payload' });
    });

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect(parsed!.requestId).toBe('real-request-id');
  });

  it('caller payload cannot spoof `userId` — context value wins when present', () => {
    const ctx = makeRequestContext({
      requestId: 'req-user-spoof',
      userId: 'real-user',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 1);

    context.runWithRequestContext(ctx, () => {
      logger.info('spoof.event', { userId: 'attacker' });
    });

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect(parsed!.userId).toBe('real-user');
  });
});

describe('ADVERSARIAL — FR-4 payload immutability (caller object must not be mutated)', () => {
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

  it('does not add `event` / `level` / `timestamp` / `requestId` keys to the caller payload object', () => {
    const payload: Record<string, unknown> = { kind: 'audit', count: 3 };
    const keysBefore = Object.keys(payload).sort();

    logger.info('immutable.event', payload);

    const keysAfter = Object.keys(payload).sort();
    expect(keysAfter).toEqual(keysBefore);
    expect(payload.kind).toBe('audit');
    expect(payload.count).toBe(3);
    expect(payload.event).toBeUndefined();
    expect(payload.level).toBeUndefined();
    expect(payload.timestamp).toBeUndefined();
    expect(payload.requestId).toBeUndefined();
  });
});

describe('ADVERSARIAL — FR-4 console-method dispatch (warn/error go to the right method)', () => {
  let logger: LoggerModule['logger'];
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;

  beforeAll(async () => {
    const mod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    logger = mod.logger;
  });

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('logger.warn emits EXACTLY ONE call to console.warn and ZERO calls to console.info', () => {
    logger.warn('dispatch.warn', {});

    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });

  it('logger.error emits EXACTLY ONE call to console.error and ZERO calls to console.info', () => {
    logger.error('dispatch.error', {});

    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(0);
    expect(warnSpy).toHaveBeenCalledTimes(0);
  });

  it('logger.info emits EXACTLY ONE call to console.info and ZERO calls to console.warn or console.error', () => {
    logger.info('dispatch.info', {});

    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy).toHaveBeenCalledTimes(0);
    expect(errorSpy).toHaveBeenCalledTimes(0);
  });
});

describe('ADVERSARIAL — FR-4 call shape (single JSON-string arg, no legacy prefix)', () => {
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

  it('emits EXACTLY ONE argument to console.info (legacy shape was `console.info("[observability]", entry)` with 2 args)', () => {
    logger.info('shape.event', { extra: 'x' });

    expect(infoSpy.mock.calls).toHaveLength(1);
    expect(infoSpy.mock.calls[0]).toHaveLength(1);
    expect(typeof infoSpy.mock.calls[0][0]).toBe('string');
    expect(infoSpy.mock.calls[0][0]).not.toBe('[observability]');
  });
});

describe('ADVERSARIAL — FR-4 deterministic timestamp under fake timers', () => {
  let logger: LoggerModule['logger'];
  let infoSpy: MockInstance<(typeof console)['info']>;

  beforeAll(async () => {
    const mod = (await import(LOGGER_MODULE_PATH)) as LoggerModule;
    logger = mod.logger;
  });

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    vi.useFakeTimers();
  });

  afterEach(() => {
    infoSpy.mockRestore();
    vi.useRealTimers();
  });

  it('emitted `timestamp` equals the faked wall clock (no leakage from real Date.now)', () => {
    const fakeNow = 1_700_000_000_000;
    vi.setSystemTime(fakeNow);

    logger.info('clock.event', {});

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect(Date.parse(parsed!.timestamp)).toBe(fakeNow);
  });
});

describe('ADVERSARIAL — FR-4 repeated emission within a single scope (no context flip)', () => {
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

  it('emitting 5 lines within the same scope carries the same `requestId` on all of them', () => {
    const ctx = makeRequestContext({
      requestId: 'sticky-request-id',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 1);

    context.runWithRequestContext(ctx, () => {
      for (let i = 0; i < 5; i += 1) {
        logger.info(`repeat.${i}`, { i });
      }
    });

    expect(infoSpy.mock.calls).toHaveLength(5);
    for (const callArgs of infoSpy.mock.calls) {
      const parsed = findJsonLogString(callArgs);
      expect(parsed).toBeDefined();
      expect(parsed!.requestId).toBe('sticky-request-id');
    }
  });
});

describe('ADVERSARIAL — FR-4 `userId` empty string is preserved (not omitted as undefined)', () => {
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

  it('an empty-string `userId` in the context is emitted as `userId: ""` in the line', () => {
    const ctx = makeRequestContext({
      userId: '',
      startedAt: FIXTURE_STARTED_AT_MS,
    });
    vi.setSystemTime(ctx.startedAt + 1);

    context.runWithRequestContext(ctx, () => {
      logger.info('empty.userid', {});
    });

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect(parsed!.userId).toBe('');
  });

  it('an absent `userId` in the context is omitted from the line (no `userId` key present)', () => {
    const ctx = {
      requestId: 'no-user',
      route: '/api/x',
      method: 'GET',
      startedAt: FIXTURE_STARTED_AT_MS,
    };
    vi.setSystemTime(ctx.startedAt + 1);

    context.runWithRequestContext(ctx, () => {
      logger.info('no.userid', {});
    });

    const parsed = findJsonLogString(infoSpy.mock.calls[0] ?? []);
    expect(parsed).toBeDefined();
    expect('userId' in (parsed as Record<string, unknown>)).toBe(false);
  });
});
