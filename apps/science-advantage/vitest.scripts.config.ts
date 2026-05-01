import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest configuration for script tests that don't require database access.
 * Run with: npx vitest run --config vitest.scripts.config.ts
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    // Use a minimal setup file without database operations
    setupFiles: ['./vitest.unit.setup.ts'],
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      reportsDirectory: './coverage/scripts',
    },
    include: [
      'scripts/**/*.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
