import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      "@reading-advantage/ai": path.resolve(__dirname, "../../packages/ai/src/index.ts"),
    },
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
