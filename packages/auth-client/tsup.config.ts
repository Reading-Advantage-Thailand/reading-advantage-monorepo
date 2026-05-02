import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm"],
  dts: true,
  esbuildOptions(options) {
    options.jsx = "automatic";
  },
  banner: {
    js: '"use client";',
  },
});
