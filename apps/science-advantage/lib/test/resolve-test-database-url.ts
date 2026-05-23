/**
 * Derives the test-DB URL from environment variables.
 *
 * Preference order:
 *   1. `TEST_DATABASE_URL` — explicit override, used verbatim.
 *   2. `DATABASE_URL` with `_test` appended to the pathname (unless it already ends with `_test`).
 *   3. Built-in default (`postgresql://postgres:postgres@localhost:5432/science_advantage_test`).
 *
 * Used by `vitest.integration.setup.ts` and `vitest.integration.global-setup.ts`
 * to point both the per-test client and the migration runner at the same DB.
 */
export function resolveTestDatabaseUrl(
  env: { DATABASE_URL?: string; TEST_DATABASE_URL?: string } = process.env,
): string {
  if (env.TEST_DATABASE_URL) {
    return env.TEST_DATABASE_URL;
  }

  const primary =
    env.DATABASE_URL ??
    'postgresql://postgres:postgres@localhost:5432/science_advantage';

  if (primary.endsWith('_test')) {
    return primary;
  }

  try {
    const url = new URL(primary);
    const pathname = url.pathname.replace(/\/$/, '');
    url.pathname = `${pathname}_test`;
    return url.toString();
  } catch {
    return `${primary}_test`;
  }
}
