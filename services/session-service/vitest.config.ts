import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/config.ts", "src/room-store.ts", "src/server.ts"],
      reporter: [["text", { skipFull: false }], "json-summary"],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    environment: "node",
    exclude: ["dist/**", "node_modules/**"],
  },
});
