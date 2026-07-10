import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@reading-advantage/knowledge-space-core": fileURLToPath(
        new URL("../knowledge-space-core/src/index.ts", import.meta.url),
      ),
      zod: fileURLToPath(
        new URL("../knowledge-space-core/node_modules/zod/index.js", import.meta.url),
      ),
    },
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
