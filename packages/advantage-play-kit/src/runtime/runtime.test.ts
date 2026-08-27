import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCartridge, type APKGameInstance, type GameFactory } from "./runtime.js";
import { createPhaserGameFactory } from "./phaser-factory.js";
import { APKRuntimeError } from "./errors.js";
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

  it("preserves a post-factory initialization failure when renderer cleanup also fails", async () => {
    const originalInitializationError = new APKRuntimeError(
      "MISSING_ASSET_SLOT",
      "Initial audio binding is unavailable",
    );
    const cleanupError = new Error("Renderer cleanup failed");
    const destroy = vi.fn(() => {
      throw cleanupError;
    });
    const diagnostic = vi.fn();
    const container = document.createElement("div");
    const factory: GameFactory = async ({ container: mountContainer }) => {
      mountContainer.append(document.createElement("canvas"));
      return {
        setMuted: () => {
          throw originalInitializationError;
        },
        destroy,
      };
    };

    await expect(mountCartridge(
      {
        container,
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: vi.fn(), diagnostic },
      },
      factory,
    )).rejects.toMatchObject({
      code: "MISSING_ASSET_SLOT",
      message: "Initial audio binding is unavailable",
    });

    expect(destroy).toHaveBeenCalledOnce();
    expect(container.childElementCount).toBe(0);
    expect(diagnostic).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        level: "error",
        code: "MISSING_ASSET_SLOT",
        message: "Initial audio binding is unavailable",
      }),
    );
    expect(diagnostic).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        level: "warning",
        code: "MOUNT_CLEANUP_FAILED",
        details: expect.objectContaining({
          cause: "Renderer cleanup failed",
          stage: "renderer destroy",
        }),
      }),
    );
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
    expect(hostComplete).toHaveBeenCalledWith(validResults, "complete");
    expect(handle.getDiagnostics().completionCount).toBe(1);
    await handle.destroy();
  });

  it("preserves completed diagnostics when the host pauses the renderer for debrief", async () => {
    let complete: ((result: unknown) => void) | undefined;
    const instance: APKGameInstance = { pause: vi.fn(), destroy: vi.fn() };
    const handle = await mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: vi.fn() },
      },
      async (context) => {
        complete = context.complete;
        return instance;
      },
    );

    complete?.(validResults);
    expect(handle.getDiagnostics().status).toBe("completed");

    handle.pause();

    expect(instance.pause).toHaveBeenCalledOnce();
    expect(handle.getDiagnostics().status).toBe("completed");
    expect(handle.getDiagnostics().lastEvent?.code).toBe("HOST_PAUSED");
    await handle.destroy();
  });

  it("does not resume a completed renderer after visibility restoration", async () => {
    let complete: ((result: unknown) => void) | undefined;
    const instance: APKGameInstance = {
      pause: vi.fn(),
      resume: vi.fn(),
      destroy: vi.fn(),
    };
    const handle = await mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: createRuntimeCartridge(),
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: vi.fn() },
      },
      async (context) => {
        complete = context.complete;
        return instance;
      },
    );

    complete?.(validResults);
    Object.defineProperty(document, "visibilityState", { configurable: true, value: "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(instance.pause).toHaveBeenCalledOnce();
    expect(handle.getDiagnostics().status).toBe("completed");

    Object.defineProperty(document, "visibilityState", { configurable: true, value: "visible" });
    document.dispatchEvent(new Event("visibilitychange"));
    expect(instance.resume).not.toHaveBeenCalled();
    expect(handle.getDiagnostics().status).toBe("completed");
    await handle.destroy();
  });

  it("destroys the production adapter with its canvas and input listeners", async () => {
    const canvas = document.createElement("canvas");
    const destroy = vi.fn((removeCanvas?: boolean) => {
      if (removeCanvas) canvas.remove();
    });
    const game = {
      destroy,
      scene: { getScenes: () => [] },
      scale: { refresh: vi.fn() },
    };
    const Game = vi.fn(function MockPhaserGame(config: Readonly<Record<string, unknown>>) {
      (config.parent as HTMLElement).append(canvas);
      return game;
    });
    const loadPhaser = vi.fn(async () => ({ AUTO: 0, Game }));
    const factory = createPhaserGameFactory(loadPhaser);
    const container = document.createElement("div");
    const removeContainerListener = vi.spyOn(container, "removeEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");

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

    await handle.destroy();

    expect(loadPhaser).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledWith(true);
    expect(container.querySelector("canvas")).toBeNull();
    expect(removeWindowListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("keyup", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointercancel", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("contextmenu", expect.any(Function));
  });

  it.each(["tutorial", "demo"] as const)(
    "suppresses completion authority for a %s session",
    async (sessionMode) => {
      let complete: ((result: unknown) => void) | undefined;
      const hostComplete = vi.fn();
      const diagnostic = vi.fn();
      const factory: GameFactory = vi.fn(async (context) => {
        expect(context.sessionMode).toBe(sessionMode);
        complete = context.complete;
        return { destroy: vi.fn() };
      });
      const handle = await mountCartridge(
        {
          container: document.createElement("div"),
          cartridge: createRuntimeCartridge(),
          input: [{ term: "river", translation: "riviere" }],
          edition: createRuntimeEdition(),
          host: { complete: hostComplete, diagnostic },
          sessionMode,
        },
        factory,
      );

      complete?.(validResults);

      expect(hostComplete).not.toHaveBeenCalled();
      expect(handle.getDiagnostics().completionCount).toBe(0);
      expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({
        code: "NON_AUTHORITATIVE_COMPLETION_SUPPRESSED",
      }));
      expect(diagnostic).toHaveBeenCalledWith(expect.objectContaining({
        details: { sessionMode },
      }));
      await handle.destroy();
    },
  );

  it("refuses a cartridge whose manifest fails the load-path contract", async () => {
    const cartridge = createRuntimeCartridge();
    const factory: GameFactory = vi.fn(async () => ({ destroy: vi.fn() }));
    const mount = (manifest: Record<string, unknown>) => mountCartridge(
      {
        container: document.createElement("div"),
        cartridge: { ...cartridge, manifest } as typeof cartridge,
        input: [{ term: "river", translation: "riviere" }],
        edition: createRuntimeEdition(),
        host: { complete: vi.fn(), diagnostic: vi.fn() },
      },
      factory,
    );

    await expect(mount({ ...cartridge.manifest, capabilities: ["arcade-physics"] }))
      .rejects.toMatchObject({ code: "INVALID_CARTRIDGE_MANIFEST" });
    await expect(mount({ ...cartridge.manifest, requiredAssetBindings: ["ui/16x16/coin.png"] }))
      .rejects.toMatchObject({ code: "INVALID_CARTRIDGE_MANIFEST" });
    await expect(mount({ ...cartridge.manifest, id: "Not Kebab Case" }))
      .rejects.toMatchObject({ code: "INVALID_CARTRIDGE_MANIFEST" });
    expect(factory, "an invalid manifest must never reach the renderer").not.toHaveBeenCalled();
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

  it("cleans up an initial unsupported responsive composition before a renderer can mount", async () => {
    const container = document.createElement("div");
    container.style.touchAction = "pan-y";
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 120 },
      clientHeight: { configurable: true, value: 120 },
    });
    const removeContainerListener = vi.spyOn(container, "removeEventListener");
    const removeWindowListener = vi.spyOn(window, "removeEventListener");
    const factory: GameFactory = vi.fn(async () => ({ destroy: vi.fn() }));

    await expect(mountCartridge({
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
    }, factory)).rejects.toMatchObject({
      code: "UNSUPPORTED_VIEWPORT_SIZE",
    });

    expect(factory).not.toHaveBeenCalled();
    expect(container.style.touchAction).toBe("pan-y");
    expect(removeWindowListener).toHaveBeenCalledWith("keydown", expect.any(Function));
    expect(removeWindowListener).toHaveBeenCalledWith("keyup", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointerdown", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointermove", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointerup", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("pointercancel", expect.any(Function));
    expect(removeContainerListener).toHaveBeenCalledWith("contextmenu", expect.any(Function));
    for (const observer of ResizeObserverStub.instances) {
      expect(observer.disconnect).toHaveBeenCalledOnce();
    }
  });
});
