import { defineConfig } from "vitest/config";

// Root-level vitest invocations (for example the Measure gate
// `pnpm exec vitest run --maxWorkers=1 apps/storytime`) load this config. It keeps the vitest
// defaults and gives the Phase 1 storytime boundary test (it parses every tracked Primary
// source with the TypeScript compiler) a per-test timeout above its 5 s default. Each app's
// own vitest.config.ts applies when vitest runs inside that app.
export default defineConfig({
  test: {
    testTimeout: 120_000,
  },
});
