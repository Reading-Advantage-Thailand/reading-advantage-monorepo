import type { SpawnSyncOptions, SpawnSyncReturns } from 'node:child_process';

type SpawnLike = (
  command: string,
  args: ReadonlyArray<string>,
  options: SpawnSyncOptions,
) => Pick<SpawnSyncReturns<Buffer>, 'status' | 'signal'>;

/**
 * Runs `pnpm --filter @reading-advantage/db migrate` against a specific
 * database URL, inheriting stdio so migration output shows up in the
 * vitest console.
 *
 * Throws if the migration process exits non-zero or is killed by a signal.
 *
 * The `spawn` parameter is injectable purely for unit testing; production
 * callers pass `child_process.spawnSync`.
 */
export function runDrizzleMigrate(params: {
  spawn: SpawnLike;
  databaseUrl: string;
}): void {
  const { spawn, databaseUrl } = params;

  const result = spawn(
    'pnpm',
    ['--filter', '@reading-advantage/db', 'migrate'],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        DATABASE_URL: databaseUrl,
      },
    },
  );

  if (result.signal) {
    throw new Error(
      `Drizzle migrate killed by signal ${result.signal} (DATABASE_URL=${databaseUrl}).`,
    );
  }
  if (result.status !== 0) {
    throw new Error(
      `Drizzle migrate exited with status ${result.status} (DATABASE_URL=${databaseUrl}).`,
    );
  }
}
