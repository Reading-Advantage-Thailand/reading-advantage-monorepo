import {
  CHARACTER_COLLISION,
  CHARACTER_ORIGIN,
  TOP_DOWN_CHARACTER_ANIMATIONS,
  TOP_DOWN_CHARACTER_GRID,
} from "../editions/asset-contract.js";
import type { RuntimeCartridge, RuntimeEdition } from "../runtime/types.js";

export const validResults = {
  accuracy: 1,
  xp: 5,
  score: 120,
  correctAnswers: 3,
  totalAttempts: 3,
};

/**
 * Creates a valid physical-pack audience edition fixture for APK tests.
 * @param overrides Edition fields to replace in the default fixture.
 * @returns A runtime-compatible Primary Chibi edition.
 */
export function createRuntimeEdition(overrides: Partial<RuntimeEdition> = {}): RuntimeEdition {
  const edition: RuntimeEdition = {
    id: "primary-chibi",
    title: "Primary Chibi",
    runtimeApiVersion: "1.0.0",
    pack: {
      id: "chibi-quest",
      version: "1.0.0",
      root: "/assets/apk/chibi-quest/v1",
      files: {
        "characters/knight_top": {
          id: "characters/knight_top",
          path: "characters/knight_top.png",
          kind: "spritesheet",
          view: "top-down",
          width: 512,
          height: 1024,
          format: "png",
          alpha: true,
          byteSize: 4096,
          sha256: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
          grid: TOP_DOWN_CHARACTER_GRID,
          animations: TOP_DOWN_CHARACTER_ANIMATIONS,
          origin: CHARACTER_ORIGIN,
          collision: CHARACTER_COLLISION,
          provenance: { source: "test-fixture", license: "LicenseRef-Test" },
        },
      },
    },
    bindings: {
      "player.hero.top.idle.down": {
        key: "player.hero.top.idle.down",
        file: "characters/knight_top",
        usage: "animation",
        view: "top-down",
        animation: "idle.down",
      },
      "player.hero.top.walk.down": {
        key: "player.hero.top.walk.down",
        file: "characters/knight_top",
        usage: "animation",
        view: "top-down",
        animation: "walk.down",
      },
    },
    tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
  };
  return { ...edition, ...overrides };
}

/**
 * Creates a minimal valid cartridge fixture for runtime tests.
 * @returns A vocabulary cartridge that requires the default edition slots.
 */
export function createRuntimeCartridge(): RuntimeCartridge {
  return {
    manifest: {
      id: "test-gate-runner",
      title: "Test Gate Runner",
      description: "A deterministic test cartridge",
      version: "0.1.0",
      runtimeApiVersion: "1.0.0",
      inputMode: "vocabulary",
      requiredAssetBindings: ["player.hero.top.idle.down"],
      capabilities: [],
    },
    createGameConfig: () => ({ scene: [] }),
  };
}
