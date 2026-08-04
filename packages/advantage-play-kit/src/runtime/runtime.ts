import {
  gameResultsSchema,
  sentenceInputSchema,
  vocabularyInputSchema,
} from "@reading-advantage/game-contracts";

import { validateEdition } from "../editions/editions.js";
import { APKRuntimeError, toAPKRuntimeError } from "./errors.js";
import { createInputController, type APKInputController } from "./input.js";
import {
  resolveResponsiveComposition,
  type SupportedResponsiveComposition,
} from "../responsive/responsive-composition.js";
import {
  createBoundedFrameScheduler,
  type BoundedFrameScheduler,
} from "../systems/bounded-frame-loop.js";
import {
  createMultiplayerSession,
  type MultiplayerSession,
} from "../systems/multiplayer-session.js";
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
 * Calculates a height that can contain every required responsive region before a browser reports layout.
 * @param responsive Runtime responsive policy, safe-area insets, and accessibility settings.
 * @returns The minimum CSS-pixel height needed for a usable responsive mount.
 */
function requiredResponsiveMountHeight(
  responsive: NonNullable<MountCartridgeOptions["responsive"]>,
): number {
  const { accessibility, config, inputCapabilities, safeArea } = responsive;
  const controlsHeight = inputCapabilities.touch
    ? config.compact.controlsHeight * accessibility.touchScale
    : 0;
  const compactRequiredHeight = Math.max(
    config.compact.minHeight,
    config.compact.navigationHeight
      + config.compact.promptHeight * accessibility.textScale
      + config.compact.statusHeight * accessibility.textScale
      + controlsHeight
      + config.compact.gap * (controlsHeight > 0 ? 4 : 3)
      + config.compact.minGameplayHeight,
  );
  const wideRequiredHeight = Math.max(
    config.wide.minHeight,
    config.wide.navigationHeight + config.wide.gap + config.wide.minGameplayHeight,
  );
  return Math.ceil(safeArea.top + safeArea.bottom + Math.max(compactRequiredHeight, wideRequiredHeight));
}

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
    cartridge.manifest.requiredAssetBindings,
    APK_RUNTIME_API_VERSION,
  );

  let status: APKRuntimeStatus = "mounting";
  let instance: APKGameInstance | undefined;
  let restartCount = 0;
  let completionCount = 0;
  let muted = false;
  let explicitlyPaused = false;
  let destroyed = false;
  let lastEvent: APKDiagnosticEvent | undefined;
  let composition: SupportedResponsiveComposition | undefined;
  let compositionFailed = false;
  let operation = Promise.resolve();
  const previousTouchAction = container.style.touchAction;
  const previousMinHeight = container.style.minHeight;
  let provisionedResponsiveMountHeight = false;
  let multiplayerSession: MultiplayerSession | undefined;
  let multiplayerScheduler: BoundedFrameScheduler | undefined;
  let multiplayerFrameRequest: number | undefined;
  let multiplayerLastFrameTime: number | undefined;

  const stopMultiplayerFrameLoop = (): void => {
    if (multiplayerFrameRequest !== undefined && typeof cancelAnimationFrame === "function") {
      cancelAnimationFrame(multiplayerFrameRequest);
    }
    multiplayerFrameRequest = undefined;
    multiplayerLastFrameTime = undefined;
  };

  const destroyMultiplayer = (): void => {
    stopMultiplayerFrameLoop();
    multiplayerSession?.destroy();
    multiplayerSession = undefined;
    multiplayerScheduler = undefined;
  };

  const constructMultiplayer = (): void => {
    if (!options.multiplayer) return;
    const sessionRef: { current: MultiplayerSession | undefined } = { current: undefined };
    const scheduler = createBoundedFrameScheduler((deltaMs) => sessionRef.current?.tick(deltaMs));
    const createSession = options.multiplayer.sessionFactory ?? createMultiplayerSession;
    sessionRef.current = createSession({
      transport: options.multiplayer.transport,
      scheduler,
    });
    multiplayerSession = sessionRef.current;
    multiplayerScheduler = scheduler;
  };

  const startMultiplayerFrameLoop = (): void => {
    if (multiplayerScheduler === undefined || typeof requestAnimationFrame !== "function") return;
    const pump = (timestamp: number): void => {
      if (destroyed || multiplayerScheduler === undefined || multiplayerScheduler.cancelled) return;
      if (multiplayerLastFrameTime !== undefined) {
        const delta = timestamp - multiplayerLastFrameTime;
        if (delta >= 0) multiplayerScheduler.tick(delta);
      }
      multiplayerLastFrameTime = timestamp;
      multiplayerFrameRequest = requestAnimationFrame(pump);
    };
    multiplayerFrameRequest = requestAnimationFrame(pump);
  };

  const readViewport = (): { width: number; height: number } => {
    const width = container.clientWidth;
    const reportedHeight = container.clientHeight;
    if (!options.responsive || width <= 0 || reportedHeight > 0) {
      return { width, height: reportedHeight };
    }
    const height = requiredResponsiveMountHeight(options.responsive);
    if (!Number.isFinite(height) || height <= 0) {
      return { width, height: reportedHeight };
    }
    container.style.minHeight = String(height) + "px";
    provisionedResponsiveMountHeight = true;
    return { width, height };
  };

  const restoreContainerStyles = (): void => {
    container.style.touchAction = previousTouchAction;
    if (provisionedResponsiveMountHeight) container.style.minHeight = previousMinHeight;
  };

  const resolveComposition = (): SupportedResponsiveComposition | undefined => {
    if (!options.responsive) return undefined;
    const resolved = resolveResponsiveComposition({
      viewport: { width, height },
      safeArea: options.responsive.safeArea,
      inputCapabilities: options.responsive.inputCapabilities,
      accessibility: options.responsive.accessibility,
      fullscreen: options.responsive.fullscreen ?? false,
      ...(composition ? { previousProfile: composition.profile } : {}),
      config: options.responsive.config,
    });
    if (!resolved.supported) {
      throw new APKRuntimeError(resolved.code, resolved.guidance, { diagnostics: resolved.diagnostics });
    }
    return resolved;
  };

  const initialViewport = readViewport();
  let width = initialViewport.width;
  let height = initialViewport.height;
  let inputController: APKInputController;
  try {
    composition = resolveComposition();
    inputController = createInputController(container);
  } catch (error) {
    restoreContainerStyles();
    throw error;
  }

  const diagnostics = (): APKRuntimeDiagnostics => ({
    status,
    cartridgeId: cartridge.manifest.id,
    editionId: edition.id,
    restartCount,
    completionCount,
    muted,
    width,
    height,
    ...(composition ? { layoutProfile: composition.profile, inputMode: composition.inputMode } : {}),
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
        ...(composition ? { composition } : {}),
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
    const previousComposition = composition;
    const viewport = readViewport();
    width = viewport.width;
    height = viewport.height;
    if (width > 0 && height > 0) {
      instance?.resize?.(width, height);
      try {
        const nextComposition = resolveComposition();
        const changed = Boolean(previousComposition && nextComposition
          && (previousComposition.profile !== nextComposition.profile
            || previousComposition.inputMode !== nextComposition.inputMode
            || JSON.stringify(previousComposition.safeRect) !== JSON.stringify(nextComposition.safeRect)));
        if (nextComposition && (changed || compositionFailed)) {
          const snapshot = instance?.captureResponsiveState?.();
          instance?.pause?.();
          inputController.cancelActiveGesture();
          if (changed) instance?.recompose?.(nextComposition);
          if (snapshot !== undefined) instance?.restoreResponsiveState?.(snapshot);
          if (!explicitlyPaused && completionCount === 0) {
            instance?.resume?.();
            status = "running";
          }
          if (changed && previousComposition) {
            diagnostic({
              level: "info",
              code: "RESPONSIVE_RECOMPOSED",
              message: `Responsive composition changed from ${previousComposition.profile} to ${nextComposition.profile}`,
              details: {
                oldProfile: previousComposition.profile,
                newProfile: nextComposition.profile,
                oldGeometry: previousComposition.safeRect,
                newGeometry: nextComposition.safeRect,
              },
            });
          } else {
            diagnostic({
              level: "info",
              code: "RESPONSIVE_COMPOSITION_RECOVERED",
              message: `Responsive composition recovered at ${nextComposition.profile}`,
              details: { profile: nextComposition.profile, inputMode: nextComposition.inputMode },
            });
          }
        }
        compositionFailed = false;
        composition = nextComposition;
      } catch (error) {
        compositionFailed = true;
        instance?.pause?.();
        status = "paused";
        const runtimeError = toAPKRuntimeError(error, "RESPONSIVE_COMPOSITION_FAILED", "Responsive composition failed");
        diagnostic({ level: "error", code: runtimeError.code, message: runtimeError.message, details: runtimeError.details });
      }
    }
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
    constructMultiplayer();
    startMultiplayerFrameLoop();
  } catch (error) {
    destroyMultiplayer();
    document.removeEventListener("visibilitychange", onVisibilityChange);
    resizeObserver?.disconnect();
    inputController.destroy();
    restoreContainerStyles();
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
      operation = operation.catch(() => undefined).then(async () => {
        if (destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
        status = "restarting";
        await instance?.destroy();
        instance = undefined;
        completionCount = 0;
        restartCount += 1;
        destroyMultiplayer();
        constructMultiplayer();
        startMultiplayerFrameLoop();
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
      destroyMultiplayer();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver?.disconnect();
      inputController.destroy();
      restoreContainerStyles();
      await operation.catch(() => undefined);
      await instance?.destroy();
      instance = undefined;
      status = "destroyed";
      diagnostic({ level: "info", code: "RUNTIME_DESTROYED", message: "Game runtime destroyed" });
    },
  };
}
