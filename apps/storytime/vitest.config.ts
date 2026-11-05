import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // The tsconfig `@/*` paths alias, so the `@/lib/...` imports of the route files resolve in
    // tests (finding F131).
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    environment: "node",
    // The AC-1.3 boundary test parses every tracked Primary source with the TypeScript
    // compiler and resolves each import; one pass takes longer than the 5 s default.
    testTimeout: 120_000,
  },
});
