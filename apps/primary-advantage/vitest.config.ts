import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{test,spec}.{ts,tsx}"],
  },
});
