import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const backendJobsEntry = fileURLToPath(
  new URL("../../packages/backend/src/jobs/index.ts", import.meta.url),
);

export default defineConfig({
  resolve: {
    alias: {
      "@reading-advantage/backend/jobs": backendJobsEntry,
    },
  },
  test: {
    coverage: {
      include: [
        "src/health.ts",
        "src/oci-contract.ts",
        "src/startup-config.ts",
      ],
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
