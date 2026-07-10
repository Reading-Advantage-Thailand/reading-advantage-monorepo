import type { RuntimeCartridge, RuntimeEdition } from "../runtime/types.js";

export const validResults = {
  accuracy: 1,
  xp: 5,
  score: 120,
  correctAnswers: 3,
  totalAttempts: 3,
};

/**
 * Creates a valid audience edition fixture for APK tests.
 * @param overrides Edition fields to replace in the default fixture.
 * @returns A runtime-compatible Primary Chibi edition.
 */
export function createRuntimeEdition(overrides: Partial<RuntimeEdition> = {}): RuntimeEdition {
  return {
    id: "primary-chibi",
    title: "Primary Chibi",
    runtimeApiVersion: "1.0.0",
    assets: {
      "player.hero": {
        key: "player.hero",
        type: "image",
        url: "/apk/primary/hero.svg",
        provenance: { source: "in-repo-placeholder", license: "CC0-1.0" },
        metadata: {
          version: "1.0.0",
          format: "svg",
          optimized: true,
          width: 64,
          height: 64,
        },
      },
      "feedback.correct": {
        key: "feedback.correct",
        type: "audio",
        url: "/apk/primary/correct.ogg",
        provenance: { source: "in-repo-placeholder", license: "CC0-1.0" },
        metadata: { version: "1.0.0", format: "ogg", optimized: true, byteSize: 2048 },
      },
    },
    palette: {
      background: 0x8bd3dd,
      player: 0xffd166,
      friendly: 0x6ee7b7,
      hostile: 0xfb7185,
      accent: 0xa78bfa,
      text: "#172554",
    },
    tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
    ...overrides,
  };
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
      requiredAssetSlots: ["player.hero", "feedback.correct"],
      capabilities: [],
    },
    createGameConfig: () => ({ scene: [] }),
  };
}
