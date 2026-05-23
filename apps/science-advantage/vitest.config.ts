import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Default vitest config used by `pnpm test`. Runs ALL tests in the app
 * (unit + integration), so it must be DB-capable. Uses the same setup +
 * globalSetup as `vitest.integration.config.ts`.
 *
 * Prefer the more specific configs when you know what scope you want:
 *   - `pnpm test:integration` \u2192 vitest.integration.config.ts (integration only)
 *   - `pnpm test -- --config vitest.unit.config.ts` \u2192 unit only, DB-free
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.integration.setup.ts'],
    globalSetup: ['./vitest.integration.global-setup.ts'],
    // Tests share a single test DB; run sequentially to avoid races.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
