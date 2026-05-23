import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./vitest.integration.setup.ts'],
    globalSetup: ['./vitest.integration.global-setup.ts'],
    include: ['**/*.integration.test.ts'],
    // Integration tests share a single test DB; run sequentially to avoid
    // truncate/insert races between files.
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
