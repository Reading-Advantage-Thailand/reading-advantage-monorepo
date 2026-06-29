import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: "automatic",
  },
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