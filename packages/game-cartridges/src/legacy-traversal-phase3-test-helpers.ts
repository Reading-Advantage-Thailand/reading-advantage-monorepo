import type {
  RuntimeEdition,
  RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit";

/** Deterministic edition shape used by Phase 3 Red cartridge-boundary tests. */
export const PHASE3_RUNTIME_EDITION: RuntimeEdition = {
  id: "phase3-test-edition",
  title: "Phase 3 Test Edition",
  runtimeApiVersion: "1.0.0",
  pack: {
    id: "phase3-test-pack",
    version: "1.0.0",
    root: "/phase3-test-pack",
    files: {},
  },
  bindings: {},
  tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
};

/**
 * Creates the stable input-controller boundary used by each Red cartridge test.
 * @returns A deterministic input controller with no live browser dependencies.
 */
export function createPhase3InputController(): {
  snapshot: () => {
    keys: readonly string[];
    pointer: {
      down: false;
      cancelled: false;
      id: null;
      kind: null;
      startX: 0;
      startY: 0;
      x: 0;
      y: 0;
    };
    destroyed: false;
  };
  cancelActiveGesture: () => void;
  destroy: () => void;
} {
  return {
    snapshot: () => ({
      keys: [],
      pointer: {
        down: false,
        cancelled: false,
        id: null,
        kind: null,
        startX: 0,
        startY: 0,
        x: 0,
        y: 0,
      },
      destroyed: false,
    }),
    cancelActiveGesture: () => undefined,
    destroy: () => undefined,
  };
}

/**
 * Rejects a cartridge configuration that has no usable scene entry.
 * @param config Public game configuration returned by a cartridge.
 * @param context Failure context included in the thrown error.
 * @returns Nothing when the configuration contains a usable scene entry.
 * @throws When the configuration omits a scene or contains only empty entries.
 */
export function assertNonEmptyCartridgeScene(
  config: Readonly<Record<string, unknown>>,
  context: string,
): void {
  const scene = config.scene;
  if (scene === undefined || scene === null) {
    throw new Error(`${context}; createGameConfig returned no scene`);
  }

  const entries = Array.isArray(scene) ? scene : [scene];
  if (entries.length === 0) {
    throw new Error(
      `${context}; createGameConfig returned an empty scene list`,
    );
  }

  for (const entry of entries) {
    if (typeof entry === "function") continue;
    if (typeof entry !== "object" || entry === null) {
      throw new Error(`${context}; scene entry is not renderer-compatible`);
    }
    if (Object.keys(entry).length === 0) {
      throw new Error(`${context}; scene entry is empty`);
    }
  }
}

/**
 * Requires the public cartridge boundary before a Red test can claim behavior.
 * @param cartridge Loaded public cartridge.
 * @param expectedId Fixture title identifier.
 * @param expectedInputMode Fixture input mode.
 * @param context Failure context included in the thrown error.
 * @returns Nothing when the manifest matches the fixture boundary.
 * @throws When the manifest identity or required bindings are invalid.
 */
export function assertCartridgeBoundary(
  cartridge: RuntimeCartridge,
  expectedId: string,
  expectedInputMode: "vocabulary" | "sentence",
  context: string,
): void {
  if (cartridge.manifest.id !== expectedId) {
    throw new Error(`${context}; manifest id is ${cartridge.manifest.id}`);
  }
  if (cartridge.manifest.inputMode !== expectedInputMode) {
    throw new Error(
      `${context}; manifest input mode is ${cartridge.manifest.inputMode}`,
    );
  }
  if (cartridge.manifest.requiredAssetBindings.length === 0) {
    throw new Error(`${context}; manifest declares no required asset bindings`);
  }
}
