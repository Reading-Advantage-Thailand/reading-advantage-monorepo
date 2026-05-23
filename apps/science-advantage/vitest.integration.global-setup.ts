import { spawnSync } from 'node:child_process';
import { resolveTestDatabaseUrl } from './lib/test/resolve-test-database-url';
import { runDrizzleMigrate } from './lib/test/run-drizzle-migrate';

/**
 * Vitest globalSetup for integration tests.
 *
 * Runs `pnpm --filter @reading-advantage/db migrate` exactly once per test run
 * against the resolved test database. Drizzle migrations are idempotent, so it
 * is safe to re-run against a warm DB \u2014 the migration runner inspects
 * `drizzle.__drizzle_migrations` and skips applied entries.
 *
 * Per-test fixtures (truncate + reseed) are handled inside each
 * *.integration.test.ts file (see e.g. cleanupScienceFixtures in
 * app/api/lessons/[lessonSlug]/route.integration.test.ts).
 */
export default function globalSetup(): void {
  const databaseUrl = resolveTestDatabaseUrl(process.env);

  console.log(`[vitest.integration] Migrating test DB \u2192 ${databaseUrl}`);

  runDrizzleMigrate({ spawn: spawnSync, databaseUrl });
}
