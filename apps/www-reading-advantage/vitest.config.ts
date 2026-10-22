import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: [path.resolve(__dirname, "src/test/setup.ts")],
    coverage: {
      provider: "v8",
      include: ["src/**"],
    },
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["scripts/__tests__/**", "node_modules/**", ".opencode/**"],
    passWithNoTests: true,
    server: {
      // next-intl imports "next/server" without an extension; let vite resolve it.
      deps: { inline: ["next-intl"] },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
