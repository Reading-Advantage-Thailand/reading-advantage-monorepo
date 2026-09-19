import vinext from "vinext";
import { defineConfig } from "vite";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [vinext()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "app"),
    },
  },
});
