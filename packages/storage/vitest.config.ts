import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 30_000,
    hookTimeout: 30_000,
    teardownTimeout: 15_000,
    exclude: ["dist/**", "node_modules/**"],
  },
});
