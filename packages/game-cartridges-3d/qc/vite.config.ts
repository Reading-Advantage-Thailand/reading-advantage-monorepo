import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const here = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: here,
  publicDir: join(here, "public"),
  server: { watch: null, fs: { allow: [join(here, "..", "..", "..")] } },
  esbuild: { target: "es2023" },
  build: { target: "es2023", outDir: join(here, "dist"), emptyOutDir: true },
});
