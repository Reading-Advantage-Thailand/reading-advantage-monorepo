import { describe, expect, it, vi } from "vitest";

import type {
  CartridgeGameConfigContext,
  RuntimeEdition,
} from "@reading-advantage/advantage-play-kit/runtime";

import {
  DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS,
  loadDragonFlightHostProofCartridge,
} from "./host-proof.js";

/** Creates an edition whose three Dragon Flight roles resolve to distinct physical assets. */
function createDragonFlightEdition(): RuntimeEdition {
  const checksum = "a".repeat(64);
  return {
    id: "host-proof-test",
    title: "Host proof test edition",
    runtimeApiVersion: "1.0.0",
    pack: {
      id: "host-proof-test-pack",
      version: "1.0.0",
      root: "/assets/apk/host-proof-test/",
      files: {
        "hero-sheet": {
          id: "hero-sheet",
          path: "characters/hero.png",
          kind: "spritesheet",
          view: "top-down",
          width: 64,
          height: 64,
          format: "png",
          alpha: true,
          byteSize: 64,
          sha256: checksum,
          grid: { frameWidth: 32, frameHeight: 32, columns: 2, rows: 2, frameCount: 4 },
          provenance: { source: "test", license: "LicenseRef-Test" },
        },
        "hit-effect": {
          id: "hit-effect",
          path: "effects/hit.png",
          kind: "image",
          view: "world",
          width: 32,
          height: 32,
          format: "png",
          alpha: true,
          byteSize: 32,
          sha256: checksum,
          provenance: { source: "test", license: "LicenseRef-Test" },
        },
        "hit-audio": {
          id: "hit-audio",
          path: "audio/hit.ogg",
          kind: "audio",
          view: "world",
          width: 1,
          height: 1,
          format: "ogg",
          alpha: false,
          byteSize: 16,
          sha256: checksum,
          provenance: { source: "test", license: "LicenseRef-Test" },
        },
      },
    },
    bindings: {
      "top-down/32x32/characters/hero-01": {
        key: "top-down/32x32/characters/hero-01",
        file: "hero-sheet",
        usage: "image",
        view: "top-down",
      },
      "effects/32x32/combat/hit-01": {
        key: "effects/32x32/combat/hit-01",
        file: "hit-effect",
        usage: "image",
        view: "world",
      },
      "audio/native/combat/hit-01": {
        key: "audio/native/combat/hit-01",
        file: "hit-audio",
        usage: "image",
        view: "world",
      },
    },
    tuning: { speed: 1, targetScale: 1, collisionScale: 1, intensity: 0.5 },
  };
}

/** Returns a minimal normalized input snapshot for one title action. */
function inputSnapshot(pressed: readonly string[]) {
  return {
    pressed,
    pointer: { released: false, cancelled: false, x: 0 },
  };
}

describe("Dragon Flight host-proof title protocol", () => {
  it("preloads the selected assets and emits only ordered title actions before completion", async () => {
    const cartridge = await loadDragonFlightHostProofCartridge();
    const snapshots = [
      inputSnapshot(["ArrowLeft"]),
      inputSnapshot(["ArrowRight"]),
      inputSnapshot(["Enter"]),
    ];
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const context = {
      input: [{ term: "dragon", translation: "drago" }],
      edition: createDragonFlightEdition(),
      complete,
      diagnostic,
      inputController: {
        snapshot: vi.fn(() => snapshots.shift() ?? inputSnapshot([])),
      },
    } as unknown as CartridgeGameConfigContext;
    const config = cartridge.createGameConfig(context);
    const scene = config.scene as {
      preload(this: { load: { image: ReturnType<typeof vi.fn>; audio: ReturnType<typeof vi.fn>; spritesheet: ReturnType<typeof vi.fn> } }): void;
      update(this: { sound: { play: ReturnType<typeof vi.fn> } }): void;
    };
    const load = { image: vi.fn(), audio: vi.fn(), spritesheet: vi.fn() };

    scene.preload.call({ load });

    expect(DRAGON_FLIGHT_REQUIRED_ASSET_BINDINGS).toEqual([
      "audio/native/combat/hit-01",
      "effects/32x32/combat/hit-01",
      "top-down/32x32/characters/hero-01",
    ]);
    expect(load.audio).toHaveBeenCalledWith(
      "apk:host-proof-test:hit-audio",
      "/assets/apk/host-proof-test/audio/hit.ogg",
    );
    expect(load.image).toHaveBeenCalledWith(
      "apk:host-proof-test:hit-effect",
      "/assets/apk/host-proof-test/effects/hit.png",
    );
    expect(load.spritesheet).toHaveBeenCalledWith(
      "apk:host-proof-test:hero-sheet",
      "/assets/apk/host-proof-test/characters/hero.png",
      { frameWidth: 32, frameHeight: 32 },
    );

    const runtimeScene = { sound: { play: vi.fn() } };
    scene.update.call(runtimeScene);
    scene.update.call(runtimeScene);
    scene.update.call(runtimeScene);

    expect(diagnostic.mock.calls.map(([event]) => event)).toEqual([
      expect.objectContaining({
        code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
        details: expect.objectContaining({ kind: "choose-gate", gate: "left", elapsedMs: expect.any(Number) }),
      }),
      expect.objectContaining({
        code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
        details: expect.objectContaining({ kind: "choose-gate", gate: "right", elapsedMs: expect.any(Number) }),
      }),
      expect.objectContaining({
        code: "DRAGON_FLIGHT_HOST_PROOF_ACTION",
        details: expect.objectContaining({ kind: "launch", elapsedMs: expect.any(Number) }),
      }),
    ]);
    expect(complete).toHaveBeenCalledWith({
      accuracy: 0.5,
      xp: 3,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 2,
    });
    expect(runtimeScene.sound.play).toHaveBeenCalledWith("apk:host-proof-test:hit-audio", { volume: 0.15 });
  });
});
