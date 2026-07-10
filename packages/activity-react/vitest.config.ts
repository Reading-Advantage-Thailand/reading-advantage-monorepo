import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@reading-advantage/activity-runtime/core": fileURLToPath(new URL("../activity-runtime/src/core.ts", import.meta.url))
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: [fileURLToPath(new URL("./src/__tests__/setup.ts", import.meta.url))],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/__tests__/**", "src/testing.ts"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
