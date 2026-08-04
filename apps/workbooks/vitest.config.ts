import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: [
      "*.{test,spec}.{ts,tsx}",
      "app/**/*.{test,spec}.{ts,tsx}",
      "app/**/__tests__/**/*.{test,spec}.{ts,tsx}",
      "components/**/*.{test,spec}.{ts,tsx}",
      "lib/**/*.{test,spec}.{ts,tsx}",
    ],
    // `.next/**` must stay excluded: `next build` emits a standalone bundle
    // that copies workspace sources, so without this the runner rediscovers
    // every test file inside the build output and hangs during collection.
    exclude: [
      "node_modules/**",
      "dist/**",
      ".next/**",
    ],
  },
});
