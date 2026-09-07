import { configDefaults, defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Default vitest config used by `pnpm test`. Runs ALL tests in the app
 * (unit + integration), so it must be DB-capable. It also loads the unit
 * browser setup for component tests.
 *
 * Prefer the more specific configs when you know what scope you want:
 *   - `pnpm test:integration` \u2192 vitest.integration.config.ts (integration only)
 *   - `pnpm test -- --config vitest.unit.config.ts` \u2192 unit only, DB-free
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.integration.setup.ts', './vitest.unit.setup.ts'],
    globalSetup: ['./vitest.integration.global-setup.ts'],
    exclude: [...configDefaults.exclude, 'e2e/**', '**/*.e2e.spec.{ts,tsx}'],
    // Tests share a single test DB; run sequentially to avoid races.
    pool: 'forks',
    fileParallelism: false,
    server: {
      deps: {
        external: [/\/packages\/sales-knowledge\/dist\//],
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
      'server-only': resolve(__dirname, './lib/test/server-only-mock.ts'),
    },
  },
});
