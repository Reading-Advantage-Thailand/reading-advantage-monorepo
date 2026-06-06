import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    testTimeout: 120_000,
    hookTimeout: 120_000,
    teardownTimeout: 60_000,
    exclude: ["dist/**", "node_modules/**"],
  },
});
