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
    fileParallelism: false,
    // Phase 7 (FR-7): the eslint contract test spawns a real ESLint
    // child process, which takes ~6 s on the current environment.
    // The default 5 s timeout is too tight for this single test.
    testTimeout: 15_000,
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
      'tests/**/*.test.{ts,tsx}',
      '!**/*.integration.test.{ts,tsx}',
    ],
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
