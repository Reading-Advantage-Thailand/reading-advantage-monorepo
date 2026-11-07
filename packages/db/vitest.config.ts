import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["**/node_modules/**", "**/dist/**"],
    // PGlite WASM startup measured 2.6 to 8.9 s on this machine, above the 5 s default.
    testTimeout: 30000,
  },
});
