import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@reading-advantage/practice-core/contract": fileURLToPath(
        new URL("../practice-core/src/practice/contract.ts", import.meta.url)
      )
    }
  },
  test: {
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.test.ts", "src/**/__tests__/**", "src/testing.ts"],
      thresholds: { statements: 80, branches: 80, functions: 80, lines: 80 }
    }
  }
});
