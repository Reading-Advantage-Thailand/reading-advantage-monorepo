import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    environmentMatchGlobs: [["src/assets/**/*.test.ts", "node"], ["scripts/**/*.test.ts", "node"]],
    clearMocks: true,
    restoreMocks: true,
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/**/*.test.{ts,tsx}", "src/**/index.ts"],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 50,
        statements: 80
      }
    }
  }
});
