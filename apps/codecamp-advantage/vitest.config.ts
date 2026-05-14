import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["components/**/*.{test,spec}.{ts,tsx}", "lib/**/*.{test,spec}.{ts,tsx}"],
    setupFiles: ["./lib/__tests__/setup.ts"],
  },
});
