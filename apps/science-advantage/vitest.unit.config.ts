import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Vitest configuration for unit tests that don't require database access.
 * Use this for testing React components, utilities, and other isolated code.
 *
 * Run with: npx vitest run --config vitest.unit.config.ts
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
      reportsDirectory: './coverage/unit',
    },
    // Only run unit tests (exclude integration tests)
    include: [
      'app/**/*.test.{ts,tsx}',
      'components/**/*.test.{ts,tsx}',
      'lib/**/*.test.{ts,tsx}',
      '!**/*.integration.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
