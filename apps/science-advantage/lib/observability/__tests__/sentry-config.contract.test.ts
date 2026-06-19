/**
 * Phase 1 contract test for FR-1 (Sentry Installation + Configuration).
 *
 * Pinned shape from `measure/tracks/observability_stack_20260603/spec.md` FR-1:
 *   - `apps/science-advantage/sentry.client.config.ts` calls
 *     `Sentry.init({ dsn, tracesSampleRate: 0.1, environment })`.
 *   - `apps/science-advantage/sentry.server.config.ts` calls
 *     `Sentry.init({ dsn, tracesSampleRate: 0.05, environment })`.
 *   - `dsn` is sourced from `process.env.SENTRY_DSN`.
 *   - `environment` is sourced from `process.env.NODE_ENV`.
 *
 * Strategy reference: `measure/tracks/observability_stack_20260603/test-strategy.md`
 *   - §2 (Testing Pyramid) classifies Phase 1 as "file-exists + import contract"
 *   - §6 (Phase 1 notes) calls out that this is *contract only*; the
 *     live-behavior throw-in-route proof is owned by Phase 9.
 *   - §7 (Live-Proof Plan) designates the targeted Red command for Phase 1:
 *       `pnpm --filter science-advantage exec vitest run
 *        lib/observability/__tests__/sentry-config.contract.test.ts`
 *
 * Intentionally red at MID handoff: both `sentry.client.config.ts` and
 * `sentry.server.config.ts` are absent, so the dynamic `import()` resolves
 * to a missing module and the test fails with an `ERR_MODULE_NOT_FOUND`
 * (or Vite/tsx equivalent). Green is the same command exiting 0 once the
 * implementation lands.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const { initMock, captureExceptionMock, captureMessageMock } = vi.hoisted(
  () => ({
    initMock: vi.fn(),
    captureExceptionMock: vi.fn(),
    captureMessageMock: vi.fn(),
  }),
);

vi.mock('@sentry/nextjs', () => ({
  init: initMock,
  captureException: captureExceptionMock,
  captureMessage: captureMessageMock,
}));

const CLIENT_CONFIG_PATH = '../../../sentry.client.config';
const SERVER_CONFIG_PATH = '../../../sentry.server.config';

describe('FR-1 sentry.client.config.ts contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    initMock.mockReset();
    captureExceptionMock.mockReset();
    captureMessageMock.mockReset();
    process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/1';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('calls Sentry.init exactly once with dsn, tracesSampleRate=0.1, and environment from NODE_ENV', async () => {
    await import(CLIENT_CONFIG_PATH);

    expect(initMock).toHaveBeenCalledTimes(1);
    const arg = initMock.mock.calls[0]?.[0] as
      | {
          dsn?: unknown;
          tracesSampleRate?: unknown;
          environment?: unknown;
        }
      | undefined;
    expect(arg).toBeDefined();
    expect(arg?.dsn).toBe('https://public@example.ingest.sentry.io/1');
    expect(arg?.tracesSampleRate).toBe(0.1);
    expect(arg?.environment).toBe('test');
  });
});

describe('FR-1 sentry.server.config.ts contract', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    initMock.mockReset();
    captureExceptionMock.mockReset();
    captureMessageMock.mockReset();
    process.env.SENTRY_DSN = 'https://public@example.ingest.sentry.io/2';
    process.env.NODE_ENV = 'test';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('calls Sentry.init exactly once with dsn, tracesSampleRate=0.05, and environment from NODE_ENV', async () => {
    await import(SERVER_CONFIG_PATH);

    expect(initMock).toHaveBeenCalledTimes(1);
    const arg = initMock.mock.calls[0]?.[0] as
      | {
          dsn?: unknown;
          tracesSampleRate?: unknown;
          environment?: unknown;
        }
      | undefined;
    expect(arg).toBeDefined();
    expect(arg?.dsn).toBe('https://public@example.ingest.sentry.io/2');
    expect(arg?.tracesSampleRate).toBe(0.05);
    expect(arg?.environment).toBe('test');
  });
});