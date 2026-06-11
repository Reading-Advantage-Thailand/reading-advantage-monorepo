import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    css: false,
  },
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
});
