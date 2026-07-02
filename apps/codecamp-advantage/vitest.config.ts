import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: [
      { find: "@reading-advantage/ai/internal-sdk", replacement: path.resolve(__dirname, "../../packages/ai/src/internal-sdk.ts") },
      { find: "@reading-advantage/ai", replacement: path.resolve(__dirname, "../../packages/ai/src/index.ts") },
      { find: "@", replacement: path.resolve(__dirname, ".") },
    ],
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: [
      "components/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
    ],
    setupFiles: ["./lib/__tests__/setup.ts"],
  },
});
