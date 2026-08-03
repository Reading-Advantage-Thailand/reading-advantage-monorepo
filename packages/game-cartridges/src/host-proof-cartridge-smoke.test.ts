/**
 * Verification-plan step 5: Core + non-Core cartridge smoke.
 * Loads shipped host-proof cartridges and asserts a real GameResults shape twice.
 */
// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { gameResultsSchema } from "@reading-advantage/game-contracts";
import {
  mountCartridge,
  type APKGameHandle,
  type APKGameInstance,
  type GameFactory,
  type RuntimeCartridge,
} from "@reading-advantage/advantage-play-kit/runtime";
import {
  DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
} from "@reading-advantage/advantage-play-kit/responsive";
import { createRuntimeEdition } from "@reading-advantage/advantage-play-kit/testing";

import { loadDragonFlightHostProofCartridge } from "./host-proof.js";
import { loadLegacyDefenseHostProofCartridge } from "./legacy-defense-host-proof.js";

class ResizeObserverStub {
  readonly observe = vi.fn();
  readonly disconnect = vi.fn();
  constructor(_callback: ResizeObserverCallback) {}
  unobserve(): void {}
}

const vocabularyInput = Object.freeze([
  Object.freeze({ term: "dragon", translation: "drago" }),
]);

/**
 * Builds a fixture edition for one cartridge's required asset bindings.
 * @param cartridge Runtime cartridge under smoke test.
 * @returns Edition that resolves every required semantic key.
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
 * Presses one title key and advances one frame.
 * @param code Keyboard code.
 * @param update Title update callback.
 */
function pressTitleKey(code: string, update: () => void): void {
  window.dispatchEvent(new KeyboardEvent("keydown", { code }));
  update();
  window.dispatchEvent(new KeyboardEvent("keyup", { code }));
}

/**
 * Mounts one host-proof cartridge and drives it to a single validated GameResults emission.
 * @param loadCartridge Loader for the cartridge under test.
 * @returns Parsed GameResults emitted by the title.
 */
async function runSmokeOnce(
  loadCartridge: () => Promise<RuntimeCartridge>,
): Promise<ReturnType<typeof gameResultsSchema.parse>> {
  const cartridge = await loadCartridge();
  const completed = vi.fn();
  const instance: APKGameInstance = {
    pause: vi.fn(),
    resume: vi.fn(),
    resize: vi.fn(),
    captureResponsiveState: vi.fn(() => ({})),
    restoreResponsiveState: vi.fn(),
    recompose: vi.fn(),
    destroy: vi.fn(),
  };
  let update: (() => void) | undefined;
  const factory: GameFactory = vi.fn(async (context) => {
    const config = context.cartridge.createGameConfig(context);
    const scene = config.scene as { update?: () => void };
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
    expect(update).toBeDefined();
    const advance = update!;
    // Gate-matching titles: wrong then correct then launch, or direct correct path.
    pressTitleKey("ArrowLeft", advance);
    pressTitleKey("ArrowRight", advance);
    pressTitleKey("Space", advance);
    pressTitleKey("Enter", advance);
    // Some titles complete on second correct gate + launch simulation via ArrowRight twice
    pressTitleKey("ArrowRight", advance);
    pressTitleKey("ArrowRight", advance);

    expect(completed).toHaveBeenCalled();
    const raw = completed.mock.calls.at(-1)?.[0];
    const result = gameResultsSchema.parse(raw);
    expect(result.totalAttempts).toBeGreaterThanOrEqual(1);
    expect(typeof result.score).toBe("number");
    expect(typeof result.accuracy).toBe("number");
    expect(handle.getDiagnostics().cartridgeId).toBe(cartridge.manifest.id);
    return result;
  } finally {
    handle?.destroy();
  }
}

describe("host-proof cartridge smoke (Core + non-Core)", () => {
  beforeEach(() => {
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns a valid GameResults shape for Dragon Flight twice with consistent primary observables", async () => {
    const first = await runSmokeOnce(loadDragonFlightHostProofCartridge);
    const second = await runSmokeOnce(loadDragonFlightHostProofCartridge);
    expect(first.accuracy).toBe(second.accuracy);
    expect(first.score).toBe(second.score);
    expect(first.correctAnswers).toBe(second.correctAnswers);
  });

  it("returns a valid GameResults shape for Castle Defense (non-Core) twice with consistent primary observables", async () => {
    const load = () => loadLegacyDefenseHostProofCartridge("castle-defense");
    const first = await runSmokeOnce(load);
    const second = await runSmokeOnce(load);
    expect(first.accuracy).toBe(second.accuracy);
    expect(first.score).toBe(second.score);
    expect(first.correctAnswers).toBe(second.correctAnswers);
  });
});
