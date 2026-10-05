import { defineConfig } from "tsup";

const shared = { format: ["esm" as const], dts: true, external: ["react", "react-dom"] };

// Two bundles: the root entry has no directive (server-safe components; Radix parts carry their
// own "use client"), and the client entry gets a "use client" banner for hook components.
export default defineConfig([
  { ...shared, entry: { index: "src/index.ts" } },
  { ...shared, entry: { client: "src/client.ts" }, banner: { js: '"use client";' } },
]);
