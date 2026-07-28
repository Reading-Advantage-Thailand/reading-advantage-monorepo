import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCartridge, type APKGameInstance, type GameFactory } from "./runtime.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "../testing/fixtures.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "../responsive/responsive-composition.js";

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

describe("mountCartridge", () => {
  beforeEach(() => {
    ResizeObserverStub.instances = [];
    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mounts, resizes, pauses for visibility, restarts, and destroys without leaks", async () => {
    const instances: APKGameInstance[] = [];
    const factory: GameFactory = vi.fn(async () => {
      const instance: APKGameInstance = {
        pause: vi.fn(),
        resume: vi.fn(),
        resize: vi.fn(),
        setMuted: vi.fn(),
        destroy: vi.fn(),
      };
      instances.push(instance);
      return instance;
    });
    const container = document.createElement("div");
    const handle = await mountCartridge(
      {
        container,
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: vi.fn() },
      },
      factory,
    );

    expect(factory).toHaveBeenCalledTimes(1);
    expect(ResizeObserverStub.instances).toHaveLength(1);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(instances[0]?.pause).toHaveBeenCalledOnce();

    await handle.restart();
    expect(instances[0]?.destroy).toHaveBeenCalledOnce();
    expect(factory).toHaveBeenCalledTimes(2);

    await handle.destroy();
    await handle.destroy();
    expect(instances[1]?.destroy).toHaveBeenCalledOnce();
    expect(ResizeObserverStub.instances[0]?.disconnect).toHaveBeenCalledOnce();
    expect(handle.getDiagnostics().status).toBe("destroyed");
  });

  it("validates completion and emits it exactly once", async () => {
    let complete: ((result: unknown) => void) | undefined;
    const hostComplete = vi.fn();
    const factory: GameFactory = vi.fn(async (context) => {
      complete = context.complete;
      return { destroy: vi.fn() };
    });
    const handle = await mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: hostComplete },
      },
      factory,
    );

    complete?.(validResults);
    complete?.({ ...validResults, score: 999 });
    complete?.({ accuracy: 200 });

    expect(hostComplete).toHaveBeenCalledTimes(1);
    expect(hostComplete).toHaveBeenCalledWith(validResults);
    expect(handle.getDiagnostics().completionCount).toBe(1);
    await handle.destroy();
  });

  it("reports invalid results as structured runtime errors", async () => {
    let complete: ((result: unknown) => void) | undefined;
    const diagnostic = vi.fn();
    const hostComplete = vi.fn();
    const handle = await mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: hostComplete, diagnostic },
      },
      async (context) => {
        complete = context.complete;
        return { destroy: vi.fn() };
      },
    );

    complete?.({ accuracy: 200 });
    expect(hostComplete).not.toHaveBeenCalled();
    expect(diagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ level: "error", code: "INVALID_GAME_RESULTS" }),
    );
    await handle.destroy();
  });

  it("exposes controls and structured diagnostics", async () => {
    const instance: APKGameInstance = {
      pause: vi.fn(),
      resume: vi.fn(),
      setMuted: vi.fn(),
      destroy: vi.fn(),
    };
    const onDiagnostic = vi.fn();
    const handle = await mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: vi.fn(), diagnostic: onDiagnostic },
      },
      async () => instance,
    );

    handle.pause();
    handle.resume();
    handle.setMuted(true);

    expect(instance.pause).toHaveBeenCalledOnce();
    expect(instance.resume).toHaveBeenCalledOnce();
    expect(instance.setMuted).toHaveBeenCalledWith(true);
    expect(handle.getDiagnostics()).toMatchObject({ status: "running", muted: true, restartCount: 0 });
    expect(onDiagnostic).toHaveBeenCalled();
    await handle.destroy();
  });

  it("recomposes on resize without recreating the canvas and restores game-owned state", async () => {
    const state = { score: 90, target: "river" };
    const instance: APKGameInstance = {
      pause: vi.fn(),
      resume: vi.fn(),
      resize: vi.fn(),
      captureResponsiveState: vi.fn(() => state),
      restoreResponsiveState: vi.fn(),
      recompose: vi.fn(),
      destroy: vi.fn(),
    };
    const factory: GameFactory = vi.fn(async (context) => {
      expect(context.composition?.profile).toBe("compact");
      return instance;
    });
    const container = document.createElement("div");
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 844 },
    });
    const handle = await mountCartridge({
      container,
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      host: { complete: vi.fn() },
      responsive: {
        config: DEFAULT_RESPONSIVE_LAYOUT_CONFIG,
        safeArea: { top: 0, right: 0, bottom: 0, left: 0 },
        inputCapabilities: { touch: true, pointer: true, keyboard: true },
        accessibility: { textScale: 1, touchScale: 1 },
      },
    }, factory);

    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 1440 },
      clientHeight: { configurable: true, value: 900 },
    });
    ResizeObserverStub.instances[0]?.callback([], ResizeObserverStub.instances[0] as unknown as ResizeObserver);

    expect(factory).toHaveBeenCalledOnce();
    expect(instance.captureResponsiveState).toHaveBeenCalledOnce();
    expect(instance.recompose).toHaveBeenCalledWith(expect.objectContaining({ profile: "wide" }));
    expect(instance.restoreResponsiveState).toHaveBeenCalledWith(state);
    expect(handle.getDiagnostics()).toMatchObject({ layoutProfile: "wide", inputMode: "hybrid" });
    await handle.destroy();
  });
});
