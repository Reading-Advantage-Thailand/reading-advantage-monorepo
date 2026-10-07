import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Next.js supplies `server-only` at build time; Vitest needs a module for it.
      "server-only": path.resolve(__dirname, "./lib/test/server-only-mock.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{test,spec}.{ts,tsx}"],
    // next-intl's ESM build imports `next/navigation`, `next/link`, and
    // `next/server` extensionless, which Node ESM cannot resolve in
    // externalized deps. Inline the navigation and middleware entries and
    // subtrees so Vite resolves those imports: tests render the real i18n
    // Link and run the real proxy (default locale test).
    server: {
      deps: {
        inline: [
          /[/\\]next-intl[/\\]dist[/\\]esm[/\\][^/\\]+[/\\](?:navigation|middleware)(?=[/\\.])/,
        ],
      },
    },
  },
});
