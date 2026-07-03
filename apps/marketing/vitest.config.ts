import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "app") },
      { find: "next/server", replacement: path.resolve(__dirname, "../../node_modules/vinext/dist/shims/server.js") },
      { find: "next/headers", replacement: path.resolve(__dirname, "../../node_modules/vinext/dist/shims/headers.js") },
      { find: "next/navigation", replacement: path.resolve(__dirname, "../../node_modules/vinext/dist/shims/navigation.js") },
      { find: "next/link", replacement: path.resolve(__dirname, "../../node_modules/vinext/dist/shims/link.js") },
      { find: "next/image", replacement: path.resolve(__dirname, "../../node_modules/vinext/dist/shims/image.js") },
      { find: /^next$/, replacement: path.resolve(__dirname, "../../node_modules/vinext/dist/shims/metadata") },
    ],
  },
  test: {
    globals: true,
    environment: "node",
    // `fileParallelism: false` runs each test file in a single worker
    // sequentially. This isolates `vi.mock(...)` factories across files so
    // a mock from one file cannot leak into another. Without this, the
    // marketing suite shows intermittent failures in
    // phase-1-boot-adversarial.test.ts because the `@reading-advantage/db`
    // mock factory (`vi.importActual(...)` + `db: { execute: vi.fn() }`)
    // races with parallel test files that mock the same module with a
    // different shape.
    fileParallelism: false,
    include: [
      "app/**/*.{test,spec}.{ts,tsx}",
      "app/**/__tests__/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "node_modules/**",
      "dist/**",
      ".next/**",
    ],
  },
});