import { defineConfig } from "vitest/config";
import path from "path";

const gameCartridgesSrc = path.resolve(__dirname, "../../packages/game-cartridges/src");

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
      // Source aliases so multi-title HostProofGameClient dynamic imports resolve in Vitest
      // without requiring a fresh packages/game-cartridges dist build.
      "@reading-advantage/game-cartridges/legacy-defense-host-proof": path.join(
        gameCartridgesSrc,
        "legacy-defense-host-proof.ts",
      ),
      "@reading-advantage/game-cartridges/legacy-puzzle-host-proof": path.join(
        gameCartridgesSrc,
        "legacy-puzzle-host-proof.ts",
      ),
      "@reading-advantage/game-cartridges/legacy-traversal-host-proof": path.join(
        gameCartridgesSrc,
        "legacy-traversal-host-proof.ts",
      ),
      "@reading-advantage/game-cartridges/host-proof": path.join(gameCartridgesSrc, "host-proof.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
    include: ["lib/**/*.{test,spec}.{ts,tsx}", "**/__tests__/**/*.{test,spec}.{ts,tsx}"],
  },
});
