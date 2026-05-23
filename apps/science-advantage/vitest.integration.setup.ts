/**
 * Per-file setup for science-advantage integration tests.
 *
 * Sets `process.env.DATABASE_URL` to the `_test`-suffixed URL so that the
 * `@reading-advantage/db` client connects to the isolated test database.
 * Migration is handled once-per-run by `vitest.integration.global-setup.ts`.
 *
 * Does NOT touch the database here — keep this file fast and side-effect-light
 * so test files start up quickly.
 */
import '@testing-library/jest-dom/vitest';
import { resolveTestDatabaseUrl } from './lib/test/resolve-test-database-url';

process.env.DATABASE_URL = resolveTestDatabaseUrl(process.env);
