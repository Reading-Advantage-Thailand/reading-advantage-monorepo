import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
  },
  // Vite 8 defaults to the `oxc` transformer for TS/TSX, which
  // IGNORES the `esbuild.*` block above (it prints a warning at
  // startup). Mirroring the JSX config under `oxc.*` keeps the
  // `hooks.test.tsx` JSX in scope for the new transformer.
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  oxc: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
