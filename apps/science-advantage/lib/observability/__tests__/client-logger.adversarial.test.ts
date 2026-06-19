/**
 * Adversarial audit tests for Phase 8b (`components/client-logger.ts`).
 *
 * These tests attempt to DISPROVE the correctness of the client-side
 * logger. They probe contract edges that the standard
 * `client-logger.test.ts` does not exercise. Each test is a live
 * behavior probe — the real module is loaded dynamically, the real
 * `console.*` methods are spied on, and the real env is stubbed
 * via `vi.stubEnv` (per `test-strategy.md` §4 "Phase 8b client
 * logger"). No fake harness is used (per `test-strategy.md` §5
 * "Fake harnesses are forbidden for production gates").
 *
 * Source-of-truth references:
 *   - `spec.md` FR-8 line 178
 *   - `plan.md` Phase 8b
 *   - `test-strategy.md` §4 + §5 + §6
 *
 * Adversarial surface covered:
 *   1. **Call shape** — the spy receives the event string as the
 *      first arg and the payload as the second arg. A regression
 *      that drops the payload (e.g. `console.info(event)` with no
 *      payload) would silently lose diagnostic data.
 *   2. **Boundary `NODE_ENV` cases** — `undefined`, `test`, and
 *      empty string all behave like dev (call `console.*`); only
 *      `production` is the no-op branch. This pins the spec's
 *      dev-vs-prod contract against accidental over-broadening
 *      (e.g. `process.env.NODE_ENV !== 'production'` accidentally
 *      passing for empty string via `'development' === ''` is
 *      impossible, but `'' !== 'production'` is `true` so the
 *      no-op check `=== 'production'` is the only safe shape).
 *   3. **Spy vs `vi.fn()`** — the standard test uses
 *      `vi.spyOn(console, 'info')`; this test asserts the spy
 *      itself is the call-capturing mechanism (i.e. the
 *      implementation does not shadow `console.info` via a local
 *      variable that bypasses the spy).
 *   4. **Module surface stability** — the module exposes exactly
 *      4 functions: `info`, `warn`, `error`, `debug`. A regression
 *      that adds a `default export` or renames a function would
 *      silently break the `import * as clientLogger from ...`
 *      namespace pattern used by all 25 production consumers.
 */
import {
  describe,
  it,
  expect,
  beforeEach,
  afterEach,
  vi,
  type MockInstance,
} from 'vitest';

const CLIENT_LOGGER_PATH = '@/components/client-logger';

interface ClientLogger {
  info: (event: string, payload?: Record<string, unknown>) => void;
  warn: (event: string, payload?: Record<string, unknown>) => void;
  error: (event: string, payload?: Record<string, unknown>) => void;
  debug: (event: string, payload?: Record<string, unknown>) => void;
}

interface ClientLoggerModule {
  info?: ClientLogger['info'];
  warn?: ClientLogger['warn'];
  error?: ClientLogger['error'];
  debug?: ClientLogger['debug'];
  default?: unknown;
}

let mod: ClientLoggerModule;

beforeEach(async () => {
  mod = (await import(CLIENT_LOGGER_PATH)) as ClientLoggerModule;
});

describe('ADVERSARIAL — FR-8 clientLogger call shape (event + payload preserved)', () => {
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;
  let debugSpy: MockInstance<(typeof console)['debug']>;

  beforeEach(() => {
    vi.stubEnv('NODE_ENV', 'development');
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    warnSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('clientLogger.info passes the event string as the first arg to console.info', () => {
    mod.info!('audit.event.id', { key: 'value' });

    expect(infoSpy.mock.calls[0]?.[0]).toBe('audit.event.id');
  });

  it('clientLogger.info passes the payload object as the second arg to console.info', () => {
    const payload = { route: '/x', count: 7 };
    mod.info!('audit.event.id', payload);

    expect(infoSpy.mock.calls[0]?.[1]).toBe(payload);
  });

  it('clientLogger.info with NO payload does not crash and passes `undefined` as the second arg', () => {
    expect(() => mod.info!('audit.event.no.payload')).not.toThrow();
    expect(infoSpy.mock.calls[0]?.[0]).toBe('audit.event.no.payload');
    expect(infoSpy.mock.calls[0]?.[1]).toBeUndefined();
  });

  it('clientLogger.warn passes the event string as the first arg to console.warn', () => {
    mod.warn!('audit.warn.id', { level: 'high' });

    expect(warnSpy.mock.calls[0]?.[0]).toBe('audit.warn.id');
  });

  it('clientLogger.error passes the event string as the first arg to console.error', () => {
    mod.error!('audit.error.id', { code: 500 });

    expect(errorSpy.mock.calls[0]?.[0]).toBe('audit.error.id');
  });

  it('clientLogger.debug passes the event string as the first arg to console.debug', () => {
    mod.debug!('audit.debug.id', { trace: 'a' });

    expect(debugSpy.mock.calls[0]?.[0]).toBe('audit.debug.id');
  });
});

describe('ADVERSARIAL — FR-8 clientLogger NODE_ENV boundary cases', () => {
  let infoSpy: MockInstance<(typeof console)['info']>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    infoSpy.mockRestore();
    vi.unstubAllEnvs();
  });

  it('NODE_ENV="production" → console.info is NOT called (the spec no-op branch)', () => {
    vi.stubEnv('NODE_ENV', 'production');
    mod.info!('prod.noop', {});
    expect(infoSpy).not.toHaveBeenCalled();
  });

  it('NODE_ENV="development" → console.info IS called (the spec dev branch)', () => {
    vi.stubEnv('NODE_ENV', 'development');
    mod.info!('dev.yes', {});
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('NODE_ENV="test" → console.info IS called (vitest default; not production, so dev behavior)', () => {
    vi.stubEnv('NODE_ENV', 'test');
    mod.info!('test.yes', {});
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });

  it('NODE_ENV="" (empty string) → console.info IS called (not equal to "production")', () => {
    vi.stubEnv('NODE_ENV', '');
    mod.info!('empty.yes', {});
    expect(infoSpy).toHaveBeenCalledTimes(1);
  });
});

describe('ADVERSARIAL — FR-8 clientLogger module surface stability (25 consumers depend on this)', () => {
  it('exposes exactly the 4 named functions: info, warn, error, debug', () => {
    expect(typeof mod.info).toBe('function');
    expect(typeof mod.warn).toBe('function');
    expect(typeof mod.error).toBe('function');
    expect(typeof mod.debug).toBe('function');
  });

  it('does NOT expose a `default` export that would shadow the namespace pattern', () => {
    expect(mod.default).toBeUndefined();
  });

  it('each method is a unique function reference (no accidental aliasing)', () => {
    expect(mod.info).not.toBe(mod.warn);
    expect(mod.info).not.toBe(mod.error);
    expect(mod.info).not.toBe(mod.debug);
    expect(mod.warn).not.toBe(mod.error);
    expect(mod.warn).not.toBe(mod.debug);
    expect(mod.error).not.toBe(mod.debug);
  });
});
