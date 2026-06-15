import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    // Limit test discovery to the source tree. The default
    // vitest glob (`**/*.{test,spec}.{ts,tsx,js,jsx}`) would also
    // pick up compiled tests under `dist/__tests__/`, which are
    // duplicate copies of the source tests and stale build artifacts
    // (e.g. `dist/__tests__/token.test.js` from the archived
    // `auth_security_hardening_20260611` track that no longer
    // has a `dist/token.js` module to import). The source tests
    // under `src/__tests__/` are the canonical test surface.
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.{idea,git,cache,output,temp}/**",
    ],
  },
});
