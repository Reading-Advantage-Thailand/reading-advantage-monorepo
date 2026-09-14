import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    // next-intl's ESM build imports `next/navigation` and `next/link`
    // extensionless, which Node ESM cannot resolve in externalized deps.
    // Inline the navigation entry and subtree so Vite resolves those
    // imports and tests can render the real i18n Link.
    server: {
      deps: {
        inline: [
          /[/\\]next-intl[/\\]dist[/\\]esm[/\\][^/\\]+[/\\]navigation(?=[/\\.])/,
        ],
      },
    },
  },
});
