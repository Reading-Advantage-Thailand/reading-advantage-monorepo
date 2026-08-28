import {
  gameResultsSchema,
  sentenceInputSchema,
  type GameResults,
  vocabularyInputSchema,
} from "@reading-advantage/game-contracts";

import { validateEdition } from "../editions/editions.js";
import { validateRuntimeCartridgeManifest } from "./cartridge-manifest.js";
import { APKRuntimeError, toAPKRuntimeError } from "./errors.js";
import { createInputController } from "./input.js";
import {
  resolveResponsiveComposition,
  type SupportedResponsiveComposition,
} from "../responsive/responsive-composition.js";
import {
  APK_RUNTIME_API_VERSION,
  type APKDiagnosticEvent,
  type APKGameHandle,
  type APKGameInstance,
  type APKRuntimeDiagnostics,
  type APKRuntimeStatus,
  type GameFactory,
  type GameInput,
  type GameTerminalOutcome,
  type MountCartridgeOptions,
} from "./types.js";

type PendingCompletion = {
  generation: number;
  result: GameResults;
  outcome: GameTerminalOutcome;
};

type PendingRendererCleanup = {
  instance: APKGameInstance;
  promise?: Promise<void>;
};

const pendingRendererCleanupByContainer = new WeakMap<HTMLElement, PendingRendererCleanup>();

const cleanupRenderer = (container: HTMLElement, instance: APKGameInstance): Promise<void> => {
  let owner = pendingRendererCleanupByContainer.get(container);
  if (owner && owner.instance !== instance) {
    return cleanupRenderer(container, owner.instance).then(() => cleanupRenderer(container, instance));
  }
  if (!owner) {
    owner = { instance };
    pendingRendererCleanupByContainer.set(container, owner);
  }
  if (owner.promise) return owner.promise;
  const cleanup = Promise.resolve()
    .then(() => instance.destroy())
    .then(
      () => {
        if (pendingRendererCleanupByContainer.get(container) === owner) {
          pendingRendererCleanupByContainer.delete(container);
        }
      },
      (error: unknown) => {
        if (pendingRendererCleanupByContainer.get(container) === owner) owner.promise = undefined;
        throw error;
      },
    );
  owner.promise = cleanup;
  return cleanup;
};

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
  const sessionMode = options.sessionMode ?? "playing";
  try {
    validateRuntimeCartridgeManifest(cartridge.manifest);
  } catch (error) {
    throw new APKRuntimeError(
      "INVALID_CARTRIDGE_MANIFEST",
      error instanceof Error ? error.message : "Cartridge manifest validation failed",
    );
  }
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
  let closeRequested = false;
  let destroyed = false;
  let runtimeResourcesReleased = false;
  let destroyOperation: Promise<void> | undefined;
  let width = container.clientWidth;
  let height = container.clientHeight;
  let lastEvent: APKDiagnosticEvent | undefined;
  let composition: SupportedResponsiveComposition | undefined;
  let operation = Promise.resolve();
  let rendererGeneration = 0;
  let mountedRendererGeneration: number | undefined;
  let pendingCompletion: PendingCompletion | undefined;
  const previousTouchAction = container.style.touchAction;
  const inputController = createInputController(container);

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

  const diagnostics = (): APKRuntimeDiagnostics => ({
    status,
    cartridgeId: cartridge.manifest.id,
    editionId: edition.id,
    restartCount,
    completionCount,
    muted,
    width,
    height,
    sessionMode,
    ...(composition ? { layoutProfile: composition.profile, inputMode: composition.inputMode } : {}),
    ...(lastEvent ? { lastEvent } : {}),
  });

  const diagnostic = (
    event: Omit<APKDiagnosticEvent, "timestamp"> & { timestamp?: number },
  ): void => {
    lastEvent = { ...event, timestamp: event.timestamp ?? Date.now() };
    try {
      host.diagnostic?.(lastEvent);
    } catch {
      // Host diagnostics must not interrupt runtime work.
    }
  };

  const reportCleanupFailure = (stage: string, error: unknown): void => {
    const cleanupEvent: APKDiagnosticEvent = {
      level: "warning",
      code: "MOUNT_CLEANUP_FAILED",
      message: `Renderer mount cleanup failed during ${stage}`,
      timestamp: Date.now(),
      details: { cause: error instanceof Error ? error.message : String(error), stage },
    };
    lastEvent = cleanupEvent;
    try {
      host.diagnostic?.(cleanupEvent);
    } catch {
      // Diagnostics must never replace the original mount failure.
    }
  };

  const cleanupFailedRenderer = async (): Promise<void> => {
    const failedInstance = instance;
    if (failedInstance === undefined) {
      try {
        container.replaceChildren();
      } catch (error) {
        reportCleanupFailure("runtime container clear", error);
      }
      return;
    }
    try {
      await cleanupRenderer(container, failedInstance);
      if (instance === failedInstance) instance = undefined;
    } catch (error) {
      reportCleanupFailure("renderer destroy", error);
      return;
    }
    try {
      container.replaceChildren();
    } catch (error) {
      reportCleanupFailure("runtime container clear", error);
    }
  };

  const failVisibilityCommand = (action: "pause" | "resume", error: unknown): void => {
    rendererGeneration += 1;
    mountedRendererGeneration = undefined;
    pendingCompletion = undefined;
    status = "error";
    diagnostic({
      level: "error",
      code: "VISIBILITY_COMMAND_FAILED",
      message: `Game ${action} failed after browser visibility changed. Restart the game.`,
      details: { action, cause: error instanceof Error ? error.message : String(error) },
    });
  };

  const notifyHostComplete = (
    generation: number,
    result: GameResults,
    outcome: GameTerminalOutcome,
  ): void => {
    void Promise.resolve()
      .then(() => {
        if (closeRequested || destroyed || status === "error" || generation !== rendererGeneration) return;
        return host.complete(result, outcome);
      })
      .catch((error: unknown) => {
        if (closeRequested || destroyed || generation !== rendererGeneration) return;
        diagnostic({
          level: "error",
          code: "HOST_COMPLETION_FAILED",
          message: error instanceof Error ? error.message : "Host completion failed",
        });
      });
  };

  const completeForGeneration = (
    generation: number,
    candidate: unknown,
    outcome: GameTerminalOutcome = "complete",
  ): void => {
    if (closeRequested || destroyed || status === "error" || generation !== rendererGeneration || completionCount > 0) return;
    if (sessionMode !== "playing") {
      diagnostic({
        level: "info",
        code: "NON_AUTHORITATIVE_COMPLETION_SUPPRESSED",
        message: `Completion was suppressed for the ${sessionMode} session`,
        details: { sessionMode },
      });
      return;
    }
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
    const terminalOutcome: GameTerminalOutcome = outcome === "victory" || outcome === "defeat" || outcome === "complete"
      ? outcome
      : "complete";
    completionCount = 1;
    status = "completed";
    diagnostic({ level: "info", code: "GAME_COMPLETED", message: "Game result accepted" });
    const completion = { generation, result: parsed.data, outcome: terminalOutcome };
    if (mountedRendererGeneration === generation) {
      notifyHostComplete(completion.generation, completion.result, completion.outcome);
    } else {
      pendingCompletion = completion;
    }
  };

  const takePendingCompletion = (): PendingCompletion | undefined => {
    const completion = pendingCompletion;
    pendingCompletion = undefined;
    return completion;
  };

  const createInstance = async (): Promise<void> => {
    if (closeRequested || destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
    const pendingRenderer = pendingRendererCleanupByContainer.get(container);
    if (pendingRenderer) {
      await cleanupRenderer(container, pendingRenderer.instance);
      if (closeRequested || destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
      try {
        container.replaceChildren();
      } catch (error) {
        reportCleanupFailure("runtime container clear", error);
        throw error;
      }
    }
    const generation = rendererGeneration + 1;
    rendererGeneration = generation;
    mountedRendererGeneration = undefined;
    pendingCompletion = undefined;
    try {
      instance = await factory({
        container,
        cartridge,
        input,
        edition,
        complete: (candidate, outcome = "complete") => completeForGeneration(generation, candidate, outcome),
        diagnostic: (event) => diagnostic(event),
        inputController,
        sessionMode,
        ...(composition ? { composition } : {}),
        ...(options.seed === undefined ? {} : { seed: options.seed }),
      });
      if (closeRequested || destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
      instance.setMuted?.(muted);
      if (width > 0 && height > 0) instance.resize?.(width, height);
      status = completionCount > 0 ? "completed" : explicitlyPaused ? "paused" : "running";
      if (explicitlyPaused) instance.pause?.();
      diagnostic({ level: "info", code: "RUNTIME_READY", message: "Game runtime ready" });
      mountedRendererGeneration = generation;
      const completion = takePendingCompletion();
      if (completion?.generation === generation && completionCount > 0) {
        notifyHostComplete(completion.generation, completion.result, completion.outcome);
      }
    } catch (error) {
      mountedRendererGeneration = undefined;
      pendingCompletion = undefined;
      status = "error";
      const runtimeError = toAPKRuntimeError(error, "MOUNT_FAILED", "Game renderer failed to mount");
      try {
        diagnostic({
          level: "error",
          code: runtimeError.code,
          message: runtimeError.message,
          details: runtimeError.details,
        });
      } catch (diagnosticError) {
        reportCleanupFailure("mount diagnostic", diagnosticError);
      }
      await cleanupFailedRenderer();
      throw runtimeError;
    }
  };

  const resize = (): void => {
    const previousComposition = composition;
    width = container.clientWidth;
    height = container.clientHeight;
    if (width > 0 && height > 0) {
      instance?.resize?.(width, height);
      try {
        const nextComposition = resolveComposition();
        if (previousComposition && nextComposition
          && (previousComposition.profile !== nextComposition.profile
            || previousComposition.inputMode !== nextComposition.inputMode
            || JSON.stringify(previousComposition.safeRect) !== JSON.stringify(nextComposition.safeRect))) {
          const snapshot = instance?.captureResponsiveState?.();
          instance?.pause?.();
          inputController.cancelActiveGesture();
          instance?.recompose?.(nextComposition);
          if (snapshot !== undefined) instance?.restoreResponsiveState?.(snapshot);
          if (!explicitlyPaused && completionCount === 0) instance?.resume?.();
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
        }
        composition = nextComposition;
      } catch (error) {
        instance?.pause?.();
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

  let resizeObserver: ResizeObserver | undefined;

  const onVisibilityChange = (): void => {
    if (closeRequested || destroyed || status === "error" || explicitlyPaused) return;
    if (document.visibilityState === "hidden") {
      try {
        instance?.pause?.();
      } catch (error) {
        failVisibilityCommand("pause", error);
        return;
      }
      if (completionCount === 0) status = "paused";
      diagnostic({ level: "info", code: "VISIBILITY_PAUSED", message: "Game paused in background" });
    } else if (completionCount === 0) {
      try {
        instance?.resume?.();
      } catch (error) {
        failVisibilityCommand("resume", error);
        return;
      }
      status = "running";
      diagnostic({ level: "info", code: "VISIBILITY_RESUMED", message: "Game resumed" });
    }
  };
  try {
    resizeObserver =
      typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(resize);
    resizeObserver?.observe(container);
    document.addEventListener("visibilitychange", onVisibilityChange);
    composition = resolveComposition();
    await createInstance();
  } catch (error) {
    if (!runtimeResourcesReleased) {
      runtimeResourcesReleased = true;
      document.removeEventListener("visibilitychange", onVisibilityChange);
      resizeObserver?.disconnect();
      inputController.destroy();
      container.style.touchAction = previousTouchAction;
    }
    throw error;
  }

  return {
    pause: () => {
      if (closeRequested || destroyed) return;
      instance?.pause?.();
      explicitlyPaused = true;
      if (completionCount === 0) status = "paused";
      diagnostic({ level: "info", code: "HOST_PAUSED", message: "Game paused by host" });
    },
    resume: () => {
      if (closeRequested || destroyed || completionCount > 0) return;
      instance?.resume?.();
      explicitlyPaused = false;
      status = completionCount > 0 ? "completed" : "running";
      diagnostic({ level: "info", code: "HOST_RESUMED", message: "Game resumed by host" });
    },
    restart: async () => {
      operation = operation.catch(() => undefined).then(async () => {
        if (closeRequested || destroyed) throw new APKRuntimeError("RUNTIME_DESTROYED", "Runtime is destroyed");
        const previousInstance = instance;
        rendererGeneration += 1;
        mountedRendererGeneration = undefined;
        pendingCompletion = undefined;
        status = "restarting";
        if (previousInstance) {
          await cleanupRenderer(container, previousInstance);
          if (instance === previousInstance) instance = undefined;
        }
        completionCount = 0;
        restartCount += 1;
        await createInstance();
      });
      return operation;
    },
    setMuted: (nextMuted) => {
      if (closeRequested || destroyed) return;
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
      closeRequested = true;
      if (destroyOperation) return destroyOperation;
      const cleanup = (async (): Promise<void> => {
        if (!runtimeResourcesReleased) {
          runtimeResourcesReleased = true;
          document.removeEventListener("visibilitychange", onVisibilityChange);
          resizeObserver?.disconnect();
          inputController.destroy();
          container.style.touchAction = previousTouchAction;
        }
        await operation.catch(() => undefined);
        const activeInstance = instance;
        if (activeInstance) {
          await cleanupRenderer(container, activeInstance);
          if (instance === activeInstance) instance = undefined;
        }
        destroyed = true;
        status = "destroyed";
        diagnostic({ level: "info", code: "RUNTIME_DESTROYED", message: "Game runtime destroyed" });
      })();
      destroyOperation = cleanup;
      try {
        await cleanup;
      } catch (error) {
        destroyOperation = undefined;
        throw error;
      }
    },
  };
}
