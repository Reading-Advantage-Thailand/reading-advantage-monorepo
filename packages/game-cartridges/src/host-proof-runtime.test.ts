// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import {
  mountCartridge,
  type APKGameHandle,
  type APKGameInstance,
  type CartridgeGameConfigContext,
  type GameFactory,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit/runtime";
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  resolveResponsiveComposition,
  type SupportedResponsiveComposition,
} from "@reading-advantage/advantage-play-kit/responsive";

import { createRuntimeEdition } from "@reading-advantage/advantage-play-kit/testing";
import * as hostProofPublicApi from "./host-proof.js";
import { loadDragonFlightHostProofCartridge } from "./host-proof.js";

class ResizeObserverStub {
  static instances: ResizeObserverStub[] = [];

  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  readonly callback: ResizeObserverCallback;

  constructor(callback: ResizeObserverCallback) {
    this.callback = callback;
    ResizeObserverStub.instances.push(this);
  }

  unobserve(): void {}
}

const vocabularyInput = Object.freeze([
  Object.freeze({ term: "dragon", translation: "drago" }),
]);

/**
 * Builds a valid fixture edition for every semantic role required by one cartridge.
 * @param cartridge Runtime cartridge whose required semantic roles must resolve.
 * @returns A fixture edition that satisfies the cartridge's declared roles.
 */
function createEditionFor(cartridge: RuntimeCartridge) {
  const base = createRuntimeEdition();
  const template = base.bindings["player.hero.top.idle.down"];
  if (!template) throw new Error("Runtime fixture must provide a canonical actor binding");
  return createRuntimeEdition({
    bindings: Object.fromEntries(
      cartridge.manifest.requiredAssetBindings.map((key) => [
        key,
        { ...template, key },
      ]),
    ),
  });
}

/**
 * Delivers one keyboard input through the mounted runtime and advances one title frame.
 * @param code Browser keyboard code representing a title-owned action.
 * @param update Dragon Flight's title-owned Phaser update callback.
 */
function pressTitleKey(code: string, update: () => void): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code }));
  update();
  window.dispatchEvent(new KeyboardEvent("keyup", { code }));
}

/** Resolves a supported responsive composition for a Dragon Flight runtime test. */
function resolveTestComposition(width: number, height: number): SupportedResponsiveComposition {
  const resolved = resolveResponsiveComposition({
    viewport: { width, height },
    safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
    inputCapabilities: { touch: true, pointer: true, keyboard: true },
    accessibility: { textScale: 1, touchScale: 1 },
    config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
  });
  if (!resolved.supported) throw new Error("Expected a supported Dragon Flight test composition");
  return resolved;
}

describe("Dragon Flight bounded host-proof runtime", () => {
  beforeEach(() => {
    ResizeObserverStub.instances = [];
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("keeps the Dragon Flight host-proof subpath free of catalog APIs", () => {
    expect(hostProofPublicApi).not.toHaveProperty("cartridgeCatalog");
    expect(hostProofPublicApi).not.toHaveProperty("cartridgeLoaders");
    expect(hostProofPublicApi).not.toHaveProperty("listCartridgeCatalog");
    expect(hostProofPublicApi).not.toHaveProperty("loadCartridge");
  });

  it("recomposes the active title scene before pointer input uses a compact-to-wide safe rectangle", async () => {
    const cartridge = await loadDragonFlightHostProofCartridge();
    const compact = resolveTestComposition(390, 844);
    const wide = resolveTestComposition(1280, 800);
    const diagnostic = vi.fn();
    const context = {
      input: vocabularyInput,
      edition: createEditionFor(cartridge),
      complete: vi.fn(),
      diagnostic,
      composition: compact,
      inputController: {
        snapshot: vi.fn(() => ({
          pressed: [],
          pointer: { released: true, cancelled: false, x: 500 },
        })),
      },
    } as unknown as CartridgeGameConfigContext;
    const config = cartridge.createGameConfig(context);
    const scene = config.scene as {
      create(this: { children: { removeAll: ReturnType<typeof vi.fn> }; add: Record<string, () => unknown>; scale: { width: number; height: number } }): void;
      update(this: { sound: { play: ReturnType<typeof vi.fn> } }): void;
      apkRecompose?(this: { children: { removeAll: ReturnType<typeof vi.fn> }; add: Record<string, () => unknown>; scale: { width: number; height: number } }, composition: SupportedResponsiveComposition): void;
    };
    const removeAll = vi.fn();
    const sprite = { setOrigin: vi.fn(), setScale: vi.fn() };
    sprite.setOrigin.mockReturnValue(sprite);
    sprite.setScale.mockReturnValue(sprite);
    const graphics = { fillStyle: vi.fn(), fillRect: vi.fn(), lineStyle: vi.fn(), strokeRect: vi.fn() };
    const renderedScene = {
      children: { removeAll },
      add: { graphics: () => graphics, image: () => sprite, text: () => sprite },
      scale: { width: 390, height: 844 },
      sound: { play: vi.fn() },
    };

    scene.create.call(renderedScene);
    expect(removeAll).toHaveBeenCalledTimes(1);
    expect(scene.apkRecompose).toEqual(expect.any(Function));

    renderedScene.scale.width = 1280;
    renderedScene.scale.height = 800;
    scene.apkRecompose?.call(renderedScene, wide);
    expect(removeAll).toHaveBeenCalledTimes(2);

    scene.update.call(renderedScene);
    expect(diagnostic).toHaveBeenLastCalledWith(expect.objectContaining({
      details: expect.objectContaining({ kind: "choose-gate", gate: "left" }),
    }));
  });

  it("mounts real Dragon Flight vocabulary input and emits one validated title result", async () => {
    const cartridge: RuntimeCartridge = await loadDragonFlightHostProofCartridge();
    expect(cartridge.manifest).toMatchObject({
      id: "dragon-flight",
      inputMode: "vocabulary",
    });

    const completed = vi.fn();
    const responsiveState = { gate: "correct", dragons: 2 };
    const instance: APKGameInstance = {
      pause: vi.fn(),
      resume: vi.fn(),
      resize: vi.fn(),
      captureResponsiveState: vi.fn(() => responsiveState),
      restoreResponsiveState: vi.fn(),
      recompose: vi.fn(),
      destroy: vi.fn(),
    };
    let update: (() => void) | undefined;
    const factory: GameFactory = vi.fn(async (context) => {
      expect(context.cartridge).toBe(cartridge);
      expect(context.input).toEqual(vocabularyInput);
      const config = context.cartridge.createGameConfig(context);
      const scene = config.scene as { update?: () => void };
      expect(scene.update).toEqual(expect.any(Function));
      update = () => scene.update?.call({ sound: { play: vi.fn() } });
      return instance;
    });

    const container = document.createElement("div");
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 844 },
    });

    let handle: APKGameHandle | undefined;
    try {
      handle = await mountCartridge(
        {
          container,
          cartridge,
          input: vocabularyInput,
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

      expect(handle.getDiagnostics()).toMatchObject({
        cartridgeId: "dragon-flight",
        layoutProfile: "compact",
        completionCount: 0,
      });
      expect(update).toBeDefined();
      const advanceTitleFrame = update!;

      pressTitleKey("ArrowLeft", advanceTitleFrame);
      expect(completed).not.toHaveBeenCalled();
      pressTitleKey("ArrowRight", advanceTitleFrame);
      expect(completed).not.toHaveBeenCalled();
      pressTitleKey("Enter", advanceTitleFrame);

      expect(completed).toHaveBeenCalledTimes(1);
      const result = gameResultsSchema.parse(completed.mock.calls[0]?.[0]);
      expect(result).toMatchObject({
        correctAnswers: 1,
        totalAttempts: 2,
      });
      expect(handle.getDiagnostics().completionCount).toBe(1);

      pressTitleKey("Enter", advanceTitleFrame);
      expect(completed).toHaveBeenCalledTimes(1);

      Object.defineProperties(container, {
        clientWidth: { configurable: true, value: 1_280 },
        clientHeight: { configurable: true, value: 800 },
      });
      ResizeObserverStub.instances[0]?.callback(
        [],
        ResizeObserverStub.instances[0] as unknown as ResizeObserver,
      );

      expect(instance.captureResponsiveState).toHaveBeenCalledOnce();
      expect(instance.recompose).toHaveBeenCalledWith(
        expect.objectContaining({ profile: "wide" }),
      );
      expect(instance.restoreResponsiveState).toHaveBeenCalledWith(responsiveState);
      expect(handle.getDiagnostics()).toMatchObject({
        layoutProfile: "wide",
        completionCount: 1,
      });
    } finally {
      await handle?.destroy();
    }
  });
});
