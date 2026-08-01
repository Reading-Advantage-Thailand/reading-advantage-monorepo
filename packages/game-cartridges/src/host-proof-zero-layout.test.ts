// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  mountCartridge,
  type APKGameHandle,
  type GameFactory,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit/runtime";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "@reading-advantage/advantage-play-kit/responsive";

import { createRuntimeEdition } from "@reading-advantage/advantage-play-kit/testing";
import { loadDragonFlightHostProofCartridge } from "./host-proof.js";

/** Builds a valid test edition for Dragon Flight's selected semantic roles. */
function createEditionFor(cartridge: RuntimeCartridge) {
  const base = createRuntimeEdition();
  const template = base.bindings["player.hero.top.idle.down"];
  if (!template) throw new Error("Runtime fixture must provide a canonical actor binding");
  return createRuntimeEdition({
    bindings: Object.fromEntries(
      cartridge.manifest.requiredAssetBindings.map((key) => [key, { ...template, key }]),
    ),
  });
}

/** Dispatches a short keyboard title action and advances Dragon Flight one frame. */
function pressTitleKey(code: string, update: () => void): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code }));
  update();
  window.dispatchEvent(new KeyboardEvent("keyup", { code }));
}

describe("Dragon Flight initial responsive layout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("starts with a positive viewport without ResizeObserver when the first host layout reports zero height", async () => {
    vi.stubGlobal("ResizeObserver", undefined);
    const cartridge = await loadDragonFlightHostProofCartridge();
    const container = document.createElement("div");
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 0 },
    });
    const completed = vi.fn();
    let update: (() => void) | undefined;
    const factory: GameFactory = vi.fn(async (context) => {
      expect(context.composition?.safeRect.height).toBeGreaterThan(0);
      const config = context.cartridge.createGameConfig(context);
      const scene = config.scene as { update?: () => void };
      update = () => scene.update?.call({ sound: { play: vi.fn() } });
      return { destroy: vi.fn() };
    });
    let handle: APKGameHandle | undefined;

    try {
      handle = await mountCartridge(
        {
          container,
          cartridge,
          input: [{ term: "dragon", translation: "drago" }],
          edition: createEditionFor(cartridge),
          host: { complete: completed },
          responsive: {
            config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
            safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
            inputCapabilities: { touch: true, pointer: true, keyboard: true },
            accessibility: { textScale: 1, touchScale: 1 },
          },
        },
        factory,
      );

      expect(update).toBeDefined();
      pressTitleKey("ArrowRight", update!);
      pressTitleKey("Enter", update!);
      expect(completed).toHaveBeenCalledOnce();
    } finally {
      await handle?.destroy();
    }
  });

  it("routes a page-offset pointer at the visual left-gate center using surface-local coordinates", async () => {
    const cartridge = await loadDragonFlightHostProofCartridge();
    const container = document.createElement("div");
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 844 },
      getBoundingClientRect: {
        configurable: true,
        value: () => ({ x: 500, y: 200, left: 500, top: 200, right: 890, bottom: 1044, width: 390, height: 844 }),
      },
    });
    const diagnostic = vi.fn();
    let update: (() => void) | undefined;
    const factory: GameFactory = vi.fn(async (context) => {
      const config = context.cartridge.createGameConfig(context);
      const scene = config.scene as { update?: () => void };
      update = () => scene.update?.call({ sound: { play: vi.fn() } });
      return { destroy: vi.fn() };
    });
    let handle: APKGameHandle | undefined;

    try {
      handle = await mountCartridge(
        {
          container,
          cartridge,
          input: [{ term: "dragon", translation: "drago" }],
          edition: createEditionFor(cartridge),
          host: { complete: vi.fn(), diagnostic },
          responsive: {
            config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
            safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
            inputCapabilities: { touch: true, pointer: true, keyboard: true },
            accessibility: { textScale: 1, touchScale: 1 },
          },
        },
        factory,
      );

      container.dispatchEvent(new PointerEvent("pointerdown", {
        pointerId: 4,
        pointerType: "touch",
        clientX: 610,
        clientY: 500,
      }));
      container.dispatchEvent(new PointerEvent("pointerup", {
        pointerId: 4,
        pointerType: "touch",
        clientX: 610,
        clientY: 500,
      }));
      if (!update) throw new Error("Dragon Flight title update was not created");
      update();

      expect(diagnostic).toHaveBeenLastCalledWith(expect.objectContaining({
        details: expect.objectContaining({ kind: "choose-gate", gate: "left" }),
      }));
    } finally {
      await handle?.destroy();
    }
  });
});
