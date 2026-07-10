import {
  gameResultsSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
} from "@reading-advantage/game-contracts";

import { validateEdition } from "../editions/editions.js";
import { APKRuntimeError, toAPKRuntimeError } from "./errors.js";
import { createInputController } from "./input.js";
import {
  APK_RUNTIME_API_VERSION,
  type APKDiagnosticEvent,
  type APKGameHandle,
  type APKGameInstance,
  type APKRuntimeDiagnostics,
  type APKRuntimeStatus,
  type GameFactory,
  type GameInput,
  type MountCartridgeOptions,
} from "./types.js";

/**
 * Mounts one cartridge with deterministic browser lifecycle ownership.
 * @param options Cartridge, strict input array, edition, host, and container.
 * @param factory Injected Phaser renderer factory.
 * @returns Controls and diagnostics for the mounted session.
 * @throws When input, edition, runtime compatibility, or renderer startup fails.
 */
export async function mountCartridge(
  options: MountCartridgeOptions,
  factory: GameFactory,
): Promise<APKGameHandle> {
  const { cartridge, container, host } = options;
  if (cartridge.manifest.runtimeApiVersion !== APK_RUNTIME_API_VERSION) {
    throw new APKRuntimeError(
      "INCOMPATIBLE_RUNTIME",
      `Cartridge ${cartridge.manifest.id} requires runtime ${cartridge.manifest.runtimeApiVersion}`,
    );
  }

  const inputSchema =
    cartridge.manifest.inputMode === "sentence" ? sentenceInputSchema : vocabularyInputSchema;
  const parsedInput = inputSchema.safeParse(options.input);
  if (!parsedInput.success) {
    throw new APKRuntimeError("INVALID_GAME_INPUT", "Cartridge input validation failed", {
      issues: parsedInput.error.issues,
    });
  }
  const input = parsedInput.data as GameInput;
  const edition = validateEdition(
    options.edition,
    cartridge.manifest.requiredAssetSlots,
    APK_RUNTIME_API_VERSION,
  );

  let status: APKRuntimeStatus = "mounting";
  let instance: APKGameInstance | undefined;
  let restartCount = 0;
  let completionCount = 0;
  let muted = false;
  let explicitlyPaused = false;
  let destroyed = false;
  let width = container.clientWidth;
  let height = container.clientHeight;
  let lastEvent: APKDiagnosticEvent | undefined;
  let operation = Promise.resolve();
  const previousTouchAction = container.style.touchAction;
  const inputController = createInputController(container);

  const diagnostics = (): APKRuntimeDiagnostics => ({
    status,
    cartridgeId: cartridge.manifest.id,
    editionId: edition.id,
    restartCount,
    completionCount,
    muted,
    width,
    height,
    ...(lastEvent ? { lastEvent } : {}),
  });

  const diagnostic = (
    event: Omit<APKDiagnosticEvent, "timestamp"> & { timestamp?: number },
  ): void => {
    lastEvent = { ...event, timestamp: event.timestamp ?? Date.now() };
    host.diagnostic?.(lastEvent);
  };

  const complete = (candidate: unknown): void => {
    if (destroyed || completionCount > 0) return;
    const parsed = gameResultsSchema.safeParse(candidate);
    if (!parsed.success) {
      diagnostic({
        level: "error",
        code: "INVALID_GAME_RESULTS",
        message: "Cartridge emitted an invalid GameResults object",
        details: { issues: parsed.error.issues },
      });
      return;
    }
    completionCount = 1;
    status = "completed";
    diagnostic({ level: "info", code: "GAME_COMPLETED", message: "Game result accepted" });
    void Promise.resolve(host.complete(parsed.data)).catch((error: unknown) => {
      diagnostic({
        level: "error",
        code: "HOST_COMPLETION_FAILED",
        message: error instanceof Error ? error.message : "Host completion failed",
      });
    });
  };

  const createInstance = async (): Promise<void> => {
    if (destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
    try {
      instance = await factory({
        container,
        cartridge,
        input,
        edition,
        complete,
        diagnostic: (event) => diagnostic(event),
        inputController,
        ...(options.seed === undefined ? {} : { seed: options.seed }),
      });
      instance.setMuted?.(muted);
      if (width > 0 && height > 0) instance.resize?.(width, height);
      status = explicitlyPaused ? "paused" : "running";
      if (explicitlyPaused) instance.pause?.();
      diagnostic({ level: "info", code: "RUNTIME_READY", message: "Game runtime ready" });
    } catch (error) {
      status = "error";
      const runtimeError = toAPKRuntimeError(error, "MOUNT_FAILED", "Game renderer failed to mount");
      diagnostic({
        level: "error",
        code: runtimeError.code,
        message: runtimeError.message,
        details: runtimeError.details,
      });
      throw runtimeError;
    }
  };

  const resize = (): void => {
    width = container.clientWidth;
    height = container.clientHeight;
    if (width > 0 && height > 0) instance?.resize?.(width, height);
    diagnostic({
      level: "debug",
      code: "VIEWPORT_RESIZED",
      message: `Viewport ${width}x${height}`,
      details: { width, height },
    });
  };

  const resizeObserver =
    typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
  resizeObserver?.observe(container);

  const onVisibilityChange = (): void => {
    if (destroyed || explicitlyPaused) return;
    if (document.visibilityState === "hidden") {
      instance?.pause?.();
      status = "paused";
      diagnostic({ level: "info", code: "VISIBILITY_PAUSED", message: "Game paused in background" });
    } else {
      instance?.resume?.();
      status = completionCount > 0 ? "completed" : "running";
      diagnostic({ level: "info", code: "VISIBILITY_RESUMED", message: "Game resumed" });
    }
  };
  document.addEventListener("visibilitychange", onVisibilityChange);

  try {
    await createInstance();
  } catch (error) {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    resizeObserver?.disconnect();
    inputController.destroy();
    container.style.touchAction = previousTouchAction;
    throw error;
  }

  return {
    pause: () => {
      if (destroyed) return;
      explicitlyPaused = true;
      instance?.pause?.();
      status = "paused";
      diagnostic({ level: "info", code: "HOST_PAUSED", message: "Game paused by host" });
    },
    resume: () => {
      if (destroyed) return;
      explicitlyPaused = false;
      instance?.resume?.();
      status = completionCount > 0 ? "completed" : "running";
      diagnostic({ level: "info", code: "HOST_RESUMED", message: "Game resumed by host" });
    },
    restart: async () => {
      operation = operation.then(async () => {
        if (destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
        status = "restarting";
        await instance?.destroy();
        instance = undefined;
        completionCount = 0;
        restartCount += 1;
        await createInstance();
      });
      return operation;
    },
    setMuted: (nextMuted) => {
      if (destroyed) return;
      muted = nextMuted;
      instance?.setMuted?.(muted);
      diagnostic({
        level: "info",
        code: muted ? "AUDIO_MUTED" : "AUDIO_UNMUTED",
        message: muted ? "Game audio muted" : "Game audio unmuted",
      });
    },
    getDiagnostics: diagnostics,
    destroy: async () => {
      if (destroyed) return;
      destroyed = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver?.disconnect();
      inputController.destroy();
      container.style.touchAction = previousTouchAction;
      await operation.catch(() => undefined);
      await instance?.destroy();
      instance = undefined;
      status = "destroyed";
      diagnostic({ level: "info", code: "RUNTIME_DESTROYED", message: "Game runtime destroyed" });
    },
  };
}
