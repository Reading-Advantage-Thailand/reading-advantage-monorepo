import { defineConfig, mergeConfig } from 'vitest/config';
import { resolve } from 'path';
import unitConfig from '../../vitest.unit.config.js';

/**
 * Wave 4 Phase 1 test harness config.
 *
 * Extends the app unit config and adds a `server-only` alias so tests that
 * import source files marked with `import 'server-only'` can run in Node.
 * This config lives under `lib/__tests__/` so it is treated as test harness,
 * not a source-code change.
 */
export default mergeConfig(
  unitConfig,
  defineConfig({
    resolve: {
      alias: {
        'server-only': resolve(__dirname, './server-only-mock.ts'),
      },
    },
  }),
);
