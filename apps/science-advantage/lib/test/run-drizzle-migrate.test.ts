import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runDrizzleMigrate } from './run-drizzle-migrate';

describe('runDrizzleMigrate', () => {
  const ORIGINAL_ENV = { ...process.env };

  beforeEach(() => {
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = { ...ORIGINAL_ENV };
    vi.restoreAllMocks();
  });

  it('invokes the spawn function with the migrate command and overridden DATABASE_URL', () => {
    const spawn = vi.fn().mockReturnValue({ status: 0 });
    runDrizzleMigrate({
      spawn,
      databaseUrl: 'postgresql://example/test_db',
    });
    expect(spawn).toHaveBeenCalledTimes(1);
    const [cmd, args, opts] = spawn.mock.calls[0];
    expect(cmd).toBe('pnpm');
    expect(args).toEqual(['--filter', '@reading-advantage/db', 'migrate']);
    expect(opts.env.DATABASE_URL).toBe('postgresql://example/test_db');
    expect(opts.stdio).toBe('inherit');
  });

  it('throws if the spawn returns a non-zero exit status', () => {
    const spawn = vi.fn().mockReturnValue({ status: 1 });
    expect(() =>
      runDrizzleMigrate({
        spawn,
        databaseUrl: 'postgresql://example/test_db',
      }),
    ).toThrow(/migrate.*exit.*1/i);
  });

  it('throws if the spawn returns a signal kill', () => {
    const spawn = vi.fn().mockReturnValue({ status: null, signal: 'SIGTERM' });
    expect(() =>
      runDrizzleMigrate({
        spawn,
        databaseUrl: 'postgresql://example/test_db',
      }),
    ).toThrow(/SIGTERM/);
  });

  it('preserves the rest of process.env when overriding DATABASE_URL', () => {
    process.env.SOME_OTHER = 'preserved';
    const spawn = vi.fn().mockReturnValue({ status: 0 });
    runDrizzleMigrate({
      spawn,
      databaseUrl: 'postgresql://example/test_db',
    });
    const [, , opts] = spawn.mock.calls[0];
    expect(opts.env.SOME_OTHER).toBe('preserved');
  });
});
