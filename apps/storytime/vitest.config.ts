import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    // The AC-1.3 boundary test parses every tracked Primary source with the TypeScript
    // compiler and resolves each import; one pass takes longer than the 5 s default.
    testTimeout: 120_000,
  },
});
