import type { SpawnSyncOptions, SpawnSyncReturns } from 'node:child_process';
import { createRequire } from 'node:module';
import path from 'node:path';

type SpawnLike = (
  command: string,
  args: ReadonlyArray<string>,
  options: SpawnSyncOptions,
) => Pick<SpawnSyncReturns<Buffer>, 'status' | 'signal'>;

/**
 * Runs the database migration script with the installed Node and tsx runtime.
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
  const require = createRequire(import.meta.url);
  const tsxLoaderPath = require.resolve('tsx/esm');
  const migrationScriptPath = path.resolve(process.cwd(), '../../packages/db/scripts/migrate.ts');

  const result = spawn(
    process.execPath,
    ['--import', tsxLoaderPath, migrationScriptPath],
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
