/**
 * Phase 8b unit tests for FR-8 (Client-side logger).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md`
 * FR-8 + `plan.md` Phase 8b:
 *   - `apps/science-advantage/components/client-logger.ts` exposes a
 *     `clientLogger` whose `.info`, `.warn`, `.error`, `.debug`
 *     methods route to the matching `console.{info,warn,error,debug}`
 *     call **only when `process.env.NODE_ENV === 'development'`**.
 *   - In production (`NODE_ENV === 'production'`) every
 *     `clientLogger.*` call is a no-op — it must NOT call
 *     `console.{info,warn,error,debug}`. (The FR-7 `no-console` ESLint
 *     rule permits `console.error` / `console.warn` from the
 *     server-side logger sink at `lib/observability/logger.ts`, but
 *     the client logger must be silent in prod to avoid leaking
 *     diagnostic data into end-user browsers.)
 *
 * Strategy reference:
 *   - `test-strategy.md` §4 (Phase 8b client logger):
 *     "`clientLogger` is browser-only — test with
 *     `@vitest/environment jsdom` (or per-file `// @vitest-environment
 *     jsdom`) and assert dev-vs-prod behavior by toggling
 *     `process.env.NODE_ENV` via `vi.stubEnv`."
 *   - `test-strategy.md` §6 (Phase 8b): "jsdom-environment unit test
 *     of `clientLogger` dev/prod branching."
 *   - `test-strategy.md` §5 (Architecture Guardrails): "Logger sink
 *     is the only `console.*` allowed in `lib/observability/logger.ts`
 *     ... routes/components import `logger`, `runWithRequestContext`,
 *     `clientLogger` only — never `@sentry/nextjs` or
 *     `@opentelemetry/api`."
 *
 * Intentionally red at MID handoff: the implementation file
 * `components/client-logger.ts` does NOT exist at HEAD. Every test
 * in this file fails with `Error: Cannot find module '@/components/client-logger'`
 * (or the resolved relative path) — the expected Red. The Green
 * gate is the same command exiting 0 once the Green role creates
 * `components/client-logger.ts` with the spec'd dev/prod branching.
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

let clientLogger: ClientLogger;

beforeEach(async () => {
  clientLogger = (await import(CLIENT_LOGGER_PATH)) as ClientLogger;
});

describe('Phase 8b — FR-8 `clientLogger` shape (dev/prod branching)', () => {
  let infoSpy: MockInstance<(typeof console)['info']>;
  let warnSpy: MockInstance<(typeof console)['warn']>;
  let errorSpy: MockInstance<(typeof console)['error']>;
  let debugSpy: MockInstance<(typeof console)['debug']>;

  beforeEach(() => {
    infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {});
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
  });

  afterEach(() => {
    // The spies are set in the inner `beforeEach` (after the
    // outer module-import `beforeEach`). If the import fails (the
    // expected Red baseline — `components/client-logger.ts` does
    // not yet exist), the outer `beforeEach` throws and the inner
    // one never runs, so `infoSpy` etc. are `undefined`. Guard
    // the `mockRestore` calls so the failure mode is the missing-
    // module assertion, not a TypeError cascade from `afterEach`.
    infoSpy?.mockRestore();
    warnSpy?.mockRestore();
    errorSpy?.mockRestore();
    debugSpy?.mockRestore();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  describe('module surface', () => {
    it('exports a `clientLogger` object with info / warn / error / debug methods', () => {
      expect(clientLogger, 'clientLogger default export must exist').toBeDefined();
      expect(typeof clientLogger.info, 'clientLogger.info must be a function').toBe('function');
      expect(typeof clientLogger.warn, 'clientLogger.warn must be a function').toBe('function');
      expect(typeof clientLogger.error, 'clientLogger.error must be a function').toBe('function');
      expect(typeof clientLogger.debug, 'clientLogger.debug must be a function').toBe('function');
    });
  });

  describe('dev mode (NODE_ENV=development) — console.* methods ARE called', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('clientLogger.info calls console.info exactly once', () => {
      clientLogger.info('phase8b.dev.info', { route: '/teacher/dashboard' });

      expect(infoSpy, 'clientLogger.info must call console.info in dev').toHaveBeenCalledTimes(1);
      expect(warnSpy, 'clientLogger.info must NOT call console.warn').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.info must NOT call console.error').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.info must NOT call console.debug').not.toHaveBeenCalled();
    });

    it('clientLogger.warn calls console.warn exactly once', () => {
      clientLogger.warn('phase8b.dev.warn', { route: '/teacher/dashboard' });

      expect(warnSpy, 'clientLogger.warn must call console.warn in dev').toHaveBeenCalledTimes(1);
      expect(infoSpy, 'clientLogger.warn must NOT call console.info').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.warn must NOT call console.error').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.warn must NOT call console.debug').not.toHaveBeenCalled();
    });

    it('clientLogger.error calls console.error exactly once', () => {
      clientLogger.error('phase8b.dev.error', { route: '/teacher/dashboard' });

      expect(errorSpy, 'clientLogger.error must call console.error in dev').toHaveBeenCalledTimes(1);
      expect(infoSpy, 'clientLogger.error must NOT call console.info').not.toHaveBeenCalled();
      expect(warnSpy, 'clientLogger.error must NOT call console.warn').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.error must NOT call console.debug').not.toHaveBeenCalled();
    });

    it('clientLogger.debug calls console.debug exactly once', () => {
      clientLogger.debug('phase8b.dev.debug', { route: '/teacher/dashboard' });

      expect(debugSpy, 'clientLogger.debug must call console.debug in dev').toHaveBeenCalledTimes(1);
      expect(infoSpy, 'clientLogger.debug must NOT call console.info').not.toHaveBeenCalled();
      expect(warnSpy, 'clientLogger.debug must NOT call console.warn').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.debug must NOT call console.error').not.toHaveBeenCalled();
    });
  });

  describe('prod mode (NODE_ENV=production) — console.* methods are NOT called', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'production');
    });

    it('clientLogger.info does NOT call any console.* method (silent no-op)', () => {
      clientLogger.info('phase8b.prod.info', { route: '/teacher/dashboard' });

      expect(infoSpy, 'clientLogger.info must NOT call console.info in prod').not.toHaveBeenCalled();
      expect(warnSpy, 'clientLogger.info must NOT call console.warn in prod').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.info must NOT call console.error in prod').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.info must NOT call console.debug in prod').not.toHaveBeenCalled();
    });

    it('clientLogger.warn does NOT call any console.* method (silent no-op)', () => {
      clientLogger.warn('phase8b.prod.warn', { route: '/teacher/dashboard' });

      expect(infoSpy, 'clientLogger.warn must NOT call console.info in prod').not.toHaveBeenCalled();
      expect(warnSpy, 'clientLogger.warn must NOT call console.warn in prod').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.warn must NOT call console.error in prod').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.warn must NOT call console.debug in prod').not.toHaveBeenCalled();
    });

    it('clientLogger.error does NOT call any console.* method (silent no-op)', () => {
      clientLogger.error('phase8b.prod.error', { route: '/teacher/dashboard' });

      expect(infoSpy, 'clientLogger.error must NOT call console.info in prod').not.toHaveBeenCalled();
      expect(warnSpy, 'clientLogger.error must NOT call console.warn in prod').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.error must NOT call console.error in prod').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.error must NOT call console.debug in prod').not.toHaveBeenCalled();
    });

    it('clientLogger.debug does NOT call any console.* method (silent no-op)', () => {
      clientLogger.debug('phase8b.prod.debug', { route: '/teacher/dashboard' });

      expect(infoSpy, 'clientLogger.debug must NOT call console.info in prod').not.toHaveBeenCalled();
      expect(warnSpy, 'clientLogger.debug must NOT call console.warn in prod').not.toHaveBeenCalled();
      expect(errorSpy, 'clientLogger.debug must NOT call console.error in prod').not.toHaveBeenCalled();
      expect(debugSpy, 'clientLogger.debug must NOT call console.debug in prod').not.toHaveBeenCalled();
    });
  });
});