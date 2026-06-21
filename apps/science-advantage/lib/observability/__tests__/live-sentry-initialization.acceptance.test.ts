// @vitest-environment node
/**
 * Phase 9 live-path Red test: FR-1 Sentry initialization is wired into
 * the Next.js runtime.
 *
 * Spec: `measure/tracks/observability_stack_20260603/spec.md`
 *   - AC #1 (line 192): "`@sentry/nextjs` installed;
 *     `sentry.client.config.ts` and `sentry.server.config.ts` exist; DSN wired."
 *   - FR-1 (line 37-51): Sentry configs call `Sentry.init(...)` and the DSN is
 *     read from env. Next.js only loads these files automatically when
 *     `next.config.ts` is wrapped with `withSentryConfig`.
 *
 * Audit context (`metadata.json` deviation_notes, 2026-06-21):
 *   "Sentry was not initialized on the live path" because the app's
 *   `next.config.ts` exported a plain object and did not apply Sentry's
 *   config wrapper.
 *
 * Test design:
 *   - One artifact assertion (`next.config.ts` source must contain
 *     `withSentryConfig`) paired with two live-behavior assertions that
 *     importing the Sentry config files triggers `Sentry.init`. The
 *     live-behavior assertions would pass in isolation today; they are
 *     included to prove the config files are functional once Next.js
 *     actually loads them via `withSentryConfig`.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const { initMock } = vi.hoisted(() => ({
  initMock: vi.fn(),
}));

vi.mock('@sentry/nextjs', () => ({
  init: initMock,
}));

const NEXT_CONFIG_PATH = fileURLToPath(
  new URL('../../../next.config.ts', import.meta.url),
);
const CLIENT_CONFIG_PATH = '../../../sentry.client.config';
const SERVER_CONFIG_PATH = '../../../sentry.server.config';

describe('Phase 9 — FR-1 live-path Sentry initialization', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    initMock.mockReset();
    process.env.NODE_ENV = 'test';
    process.env.NEXT_PUBLIC_SENTRY_DSN =
      'https://public@example.ingest.sentry.io/1';
    process.env.SENTRY_DSN = 'https://private@example.ingest.sentry.io/2';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('next.config.ts is wrapped with withSentryConfig so Next.js loads the Sentry configs', () => {
    const source = fs.readFileSync(NEXT_CONFIG_PATH, 'utf-8');
    expect(
      source,
      'Next.js only loads sentry.client.config.ts / sentry.server.config.ts on the live path when next.config.ts is wrapped with withSentryConfig.',
    ).toContain('withSentryConfig');
  });

  it('sentry.client.config.ts calls Sentry.init on import', async () => {
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

  it('sentry.server.config.ts calls Sentry.init on import', async () => {
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
    expect(arg?.dsn).toBe('https://private@example.ingest.sentry.io/2');
    expect(arg?.tracesSampleRate).toBe(0.05);
    expect(arg?.environment).toBe('test');
  });
});
