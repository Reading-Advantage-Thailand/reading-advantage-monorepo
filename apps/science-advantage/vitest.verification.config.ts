import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

/**
 * Runs repository and CI verification gates without database setup.
 * Run this config through the Turbo verification task after a real build.
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['lib/ci-gates/**/*.test.ts'],
    pool: 'forks',
    fileParallelism: false,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
      'server-only': resolve(__dirname, './lib/test/server-only-mock.ts'),
    },
  },
});
