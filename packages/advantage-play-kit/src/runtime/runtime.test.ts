import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountCartridge, type APKGameInstance, type GameFactory } from "./runtime.js";
import { createRuntimeCartridge, createRuntimeEdition, validResults } from "../testing/fixtures.js";
import { DEFAULT_RESPONSIVE_LAYOUT_CONFIG } from "../responsive/responsive-composition.js";
import type {
  MultiplayerSession,
  MultiplayerSessionOptions,
  MultiplayerTransport,
} from "../systems/multiplayer-session.js";

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

function createFakeTransport(): MultiplayerTransport {
  return {
    send: vi.fn(),
    onMessage: vi.fn(() => () => {}),
    close: vi.fn(),
  };
}

function createFakeSession(): MultiplayerSession {
  return {
    join: vi.fn(),
    submit: vi.fn(),
    sendInput: vi.fn(),
    getState: vi.fn(() => ({
      phase: "idle",
      player: null,
      room: null,
      countdownStartsAtMs: null,
      round: null,
      ranking: null,
      lastError: null,
    })),
    subscribe: vi.fn(() => () => {}),
    tick: vi.fn(),
    destroy: vi.fn(),
  };
}

function stubAnimationFrame(): Array<(timestamp: number) => void> {
  const callbacks: Array<(timestamp: number) => void> = [];
  vi.stubGlobal("requestAnimationFrame", (callback: (timestamp: number) => void): number => {
    callbacks.push(callback);
    return callbacks.length;
  });
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  return callbacks;
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

  it("provisions an initial zero-height responsive mount and restores caller styles on destroy", async () => {
    const container = document.createElement("div");
    container.style.minHeight = "17px";
    container.style.touchAction = "manipulation";
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 0 },
    });
    const instance: APKGameInstance = { destroy: vi.fn() };
    const factory: GameFactory = vi.fn(async (context) => {
      expect(context.composition?.safeRect.height).toBeGreaterThan(0);
      return instance;
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

    expect(Number.parseFloat(container.style.minHeight)).toBeGreaterThan(0);
    expect(container.style.minHeight).not.toBe("17px");
    expect(container.style.touchAction).toBe("none");

    await handle.destroy();

    expect(instance.destroy).toHaveBeenCalledOnce();
    expect(container.style.minHeight).toBe("17px");
    expect(container.style.touchAction).toBe("manipulation");
  });

  it("does not leak window listeners or container styles when composition resolution fails at mount", async () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const container = document.createElement("div");
    container.style.touchAction = "manipulation";
    container.style.minHeight = "17px";
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 0 },
    });

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
    }, vi.fn())).rejects.toMatchObject({ code: "UNSUPPORTED_VIEWPORT_SIZE" });

    const added = addEventListener.mock.calls.filter(([type]) => type === "keydown" || type === "keyup");
    const removed = removeEventListener.mock.calls.filter(([type]) => type === "keydown" || type === "keyup");
    expect(removed).toHaveLength(added.length);
    expect(container.style.touchAction).toBe("manipulation");
    expect(container.style.minHeight).toBe("17px");
  });

  it("resumes a transiently unsupported viewport on recovery even when composition is unchanged", async () => {
    const instance: APKGameInstance = {
      pause: vi.fn(),
      resume: vi.fn(),
      resize: vi.fn(),
      destroy: vi.fn(),
    };
    const factory: GameFactory = vi.fn(async () => instance);
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
    expect(handle.getDiagnostics().status).toBe("running");

    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 100 },
      clientHeight: { configurable: true, value: 100 },
    });
    ResizeObserverStub.instances[0]?.callback([], ResizeObserverStub.instances[0] as unknown as ResizeObserver);
    expect(instance.pause).toHaveBeenCalled();
    expect(handle.getDiagnostics().status).toBe("paused");

    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 844 },
    });
    ResizeObserverStub.instances[0]?.callback([], ResizeObserverStub.instances[0] as unknown as ResizeObserver);

    expect(instance.resume).toHaveBeenCalled();
    expect(handle.getDiagnostics().status).toBe("running");
    await handle.destroy();
  });

  it("recovers restart after a failed recreation attempt", async () => {
    let failNext = false;
    const factory: GameFactory = vi.fn(async () => {
      if (failNext) throw new Error("renderer crashed");
      return { destroy: vi.fn() };
    });
    const handle = await mountCartridge({
      container: document.createElement("div"),
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      host: { complete: vi.fn() },
    }, factory);

    failNext = true;
    await expect(handle.restart()).rejects.toThrow("renderer crashed");
    expect(handle.getDiagnostics().status).toBe("error");

    failNext = false;
    await handle.restart();
    expect(factory).toHaveBeenCalledTimes(3);
    expect(handle.getDiagnostics().status).toBe("running");
    await handle.destroy();
  });

  it("restores caller styles when a zero-height responsive mount factory rejects", async () => {
    const container = document.createElement("div");
    container.style.minHeight = "29px";
    container.style.touchAction = "manipulation";
    Object.defineProperties(container, {
      clientWidth: { configurable: true, value: 390 },
      clientHeight: { configurable: true, value: 0 },
    });
    const factory: GameFactory = vi.fn(async (context) => {
      expect(context.composition?.safeRect.height).toBeGreaterThan(0);
      expect(Number.parseFloat(container.style.minHeight)).toBeGreaterThan(0);
      throw new Error("renderer unavailable");
    });

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
    }, factory)).rejects.toMatchObject({ code: "MOUNT_FAILED" });

    expect(container.style.minHeight).toBe("29px");
    expect(container.style.touchAction).toBe("manipulation");
  });

  it("mounts a multiplayer session through the injected factory and wires its tick to the bounded scheduler", async () => {
    const rafCallbacks = stubAnimationFrame();
    const transport = createFakeTransport();
    const sessions: MultiplayerSession[] = [];
    const sessionFactory = vi.fn((_options: MultiplayerSessionOptions): MultiplayerSession => {
      const session = createFakeSession();
      sessions.push(session);
      return session;
    });
    const handle = await mountCartridge({
      container: document.createElement("div"),
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      host: { complete: vi.fn() },
      multiplayer: { transport, sessionFactory },
    }, async () => ({ destroy: vi.fn() }));

    expect(sessionFactory).toHaveBeenCalledTimes(1);
    expect(sessionFactory).toHaveBeenCalledWith(expect.objectContaining({ transport }));
    const session = sessions[0];
    expect(session).toBeDefined();
    expect(vi.mocked(session!.tick)).not.toHaveBeenCalled();

    rafCallbacks.shift()?.(1_000);
    rafCallbacks.shift()?.(2_000);
    expect(vi.mocked(session!.tick)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(session!.tick)).toHaveBeenCalledWith(50);

    rafCallbacks.shift()?.(2_016);
    expect(vi.mocked(session!.tick)).toHaveBeenCalledTimes(2);
    expect(vi.mocked(session!.tick)).toHaveBeenLastCalledWith(16);

    await handle.destroy();
    expect(vi.mocked(session!.destroy)).toHaveBeenCalledTimes(1);
  });

  it("defaults the session factory to createMultiplayerSession and closes the transport on destroy", async () => {
    const transport = createFakeTransport();
    const handle = await mountCartridge({
      container: document.createElement("div"),
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      host: { complete: vi.fn() },
      multiplayer: { transport },
    }, async () => ({ destroy: vi.fn() }));

    await handle.destroy();
    expect(transport.close).toHaveBeenCalledTimes(1);
  });

  it("destroys and reconstructs the multiplayer session on restart", async () => {
    stubAnimationFrame();
    const sessions: MultiplayerSession[] = [];
    const sessionFactory = vi.fn((_options: MultiplayerSessionOptions): MultiplayerSession => {
      const session = createFakeSession();
      sessions.push(session);
      return session;
    });
    const handle = await mountCartridge({
      container: document.createElement("div"),
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      host: { complete: vi.fn() },
      multiplayer: { transport: createFakeTransport(), sessionFactory },
    }, async () => ({ destroy: vi.fn() }));

    expect(sessionFactory).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sessions[0]!.tick)).not.toHaveBeenCalled();

    await handle.restart();
    expect(sessionFactory).toHaveBeenCalledTimes(2);
    expect(vi.mocked(sessions[0]!.destroy)).toHaveBeenCalledTimes(1);
    expect(vi.mocked(sessions[1]!.tick)).not.toHaveBeenCalled();

    await handle.restart();
    expect(sessionFactory).toHaveBeenCalledTimes(3);
    expect(vi.mocked(sessions[1]!.destroy)).toHaveBeenCalledTimes(1);

    await handle.destroy();
    expect(vi.mocked(sessions[2]!.destroy)).toHaveBeenCalledTimes(1);
  });

  it("never constructs a multiplayer session when multiplayer is absent", async () => {
    const sessionFactory = vi.fn((_options: MultiplayerSessionOptions): MultiplayerSession => {
      return createFakeSession();
    });
    const transport = createFakeTransport();
    const handle = await mountCartridge({
      container: document.createElement("div"),
      cartridge: createRuntimeCartridge(),
      input: [{ term: "river", translation: "riviere" }],
      edition: createRuntimeEdition(),
      host: { complete: vi.fn() },
    }, async () => ({ destroy: vi.fn() }));

    expect(sessionFactory).not.toHaveBeenCalled();
    expect(transport.close).not.toHaveBeenCalled();

    await handle.restart();
    await handle.destroy();

    expect(sessionFactory).not.toHaveBeenCalled();
    expect(transport.close).not.toHaveBeenCalled();
  });
});
