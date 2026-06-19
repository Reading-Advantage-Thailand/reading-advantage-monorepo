import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: [
      "app/**/*.{test,spec}.{ts,tsx}",
      "app/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "node_modules/**",
      "dist/**",
      ".next/**",
      // owned by measure/tracks/video_pipeline_20260613/plan.md:11 (Phase 1 verification, [~])
      // Re-include on task flip to [x] per test-strategy.md §8.
      "app/**/__tests__/phase-1-boot.test.ts",
    ],
  },
});