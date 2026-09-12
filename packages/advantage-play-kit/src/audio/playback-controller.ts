import {
  MAX_LISTENING_SESSION_ITEMS,
  listeningEvidenceSchema,
  listeningSessionConfigSchema,
  type ListeningEvidence,
} from "@reading-advantage/game-contracts";

import {
  ListeningAudioControllerError,
  type ListeningAudioClipReference,
  type ListeningAudioController,
  type ListeningAudioControllerOptions,
  type ListeningAudioFailureCode,
  type ListeningAudioSnapshot,
} from "./contracts.js";

const MIN_PREPARATION_TIMEOUT_MS = 100;
const MAX_PREPARATION_TIMEOUT_MS = 30_000;
const DEFAULT_PLAYBACK_TIMEOUT_MS = 30_000;
const MAX_PLAYBACK_TIMEOUT_MS = 120_000;
const MAX_PRELOAD_AHEAD = 3;

function toControllerError(
  error: unknown,
  fallbackCode: ListeningAudioFailureCode,
  fallbackMessage: string,
): ListeningAudioControllerError {
  return error instanceof ListeningAudioControllerError
    ? error
    : new ListeningAudioControllerError(fallbackCode, fallbackMessage, error);
}

/**
 * Creates a bounded provider-neutral controller for listening prompt audio.
 * @param options Session, clips, adapter ports, timeout, and preload policy.
 * @returns A controller with playback lifecycle and strict learning evidence.
 * @throws When options or indexed clip references are invalid.
 */
export function createListeningAudioController<PreparedClip>(
  options: ListeningAudioControllerOptions<PreparedClip>,
): ListeningAudioController {
  const session = listeningSessionConfigSchema.parse(options.session);
  if (
    !Number.isInteger(options.preloadAhead)
    || options.preloadAhead < 0
    || options.preloadAhead > MAX_PRELOAD_AHEAD
  ) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Listening preloadAhead must be an integer from zero through three",
    );
  }
  const playbackTimeoutMs = options.playbackTimeoutMs ?? DEFAULT_PLAYBACK_TIMEOUT_MS;
  if (
    !Number.isInteger(playbackTimeoutMs)
    || playbackTimeoutMs < MIN_PREPARATION_TIMEOUT_MS
    || playbackTimeoutMs > MAX_PLAYBACK_TIMEOUT_MS
  ) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Listening playback timeout must be from 100 through 120000 milliseconds",
    );
  }
  if (
    !Number.isInteger(options.preparationTimeoutMs)
    || options.preparationTimeoutMs < MIN_PREPARATION_TIMEOUT_MS
    || options.preparationTimeoutMs > MAX_PREPARATION_TIMEOUT_MS
  ) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Listening preparation timeout must be from 100 through 30000 milliseconds",
    );
  }
  if (options.clips.length < 1 || options.clips.length > MAX_LISTENING_SESSION_ITEMS) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Listening clips must contain from one through 50 items",
    );
  }

  const clips = new Map<number, ListeningAudioClipReference>();
  for (const reference of options.clips) {
    if (
      !Number.isInteger(reference.itemPosition)
      || reference.itemPosition < 0
      || reference.itemPosition >= options.clips.length
      || clips.has(reference.itemPosition)
      || !reference.url.trim()
      || !reference.mediaType.startsWith("audio/")
    ) {
      throw new ListeningAudioControllerError(
        "invalid-configuration",
        "Listening clip references must cover unique session item positions",
      );
    }
    clips.set(reference.itemPosition, Object.freeze({ ...reference }));
  }
  if (clips.size !== options.clips.length) {
    throw new ListeningAudioControllerError(
      "invalid-configuration",
      "Listening clip references must cover every session item position",
    );
  }

  const prepared = new Map<number, PreparedClip>();
  const assistance = new Set<number>();
  const fallbacks = new Set<number>();
  const replayCounts = new Map<number, number>();
  const failures = new Map<number, "load-failed" | "decode-failed" | "playback-failed">();
  let state: Omit<ListeningAudioSnapshot, "muted"> = Object.freeze({ status: "idle" });
  let generation = 0;
  let activeAbort: AbortController | undefined;
  const preloadAborts = new Map<number, AbortController>();
  let preparationWindow = new Set<number>();
  let restoreDucking: (() => void) | undefined;
  let destroyed = false;
  let muted = false;

  const snapshot = (): ListeningAudioSnapshot => Object.freeze({
    ...state,
    muted,
    ...(state.failure ? { failure: Object.freeze({ ...state.failure }) } : {}),
  });

  const assertActive = (): void => {
    if (destroyed) {
      throw new ListeningAudioControllerError("destroyed", "Listening audio is destroyed");
    }
  };

  const referenceAt = (itemPosition: number): ListeningAudioClipReference => {
    assertActive();
    const reference = clips.get(itemPosition);
    if (!reference) {
      throw new ListeningAudioControllerError(
        "invalid-item-position",
        "Listening item position is outside this session",
      );
    }
    return reference;
  };

  const restoreBackgroundAudio = (): void => {
    const restore = restoreDucking;
    restoreDucking = undefined;
    restore?.();
  };

  const cancelActive = (): void => {
    generation += 1;
    activeAbort?.abort();
    activeAbort = undefined;
    restoreBackgroundAudio();
  };

  const cancelPreloads = (): void => {
    for (const abort of preloadAborts.values()) abort.abort();
    preloadAborts.clear();
  };

  const releasePrepared = (): void => {
    for (const clip of prepared.values()) options.preparation.release(clip);
    prepared.clear();
  };

  const recordFailure = (
    itemPosition: number,
    error: ListeningAudioControllerError,
  ): void => {
    if (
      error.code === "load-failed"
      || error.code === "decode-failed"
      || error.code === "playback-failed"
    ) {
      failures.set(itemPosition, error.code);
    }
    state = Object.freeze({
      status: "failed",
      activeItemPosition: itemPosition,
      failure: Object.freeze({
        code: error.code,
        itemPosition,
        message: error.message,
      }),
    });
  };

  const prepareWithTimeout = async (
    reference: ListeningAudioClipReference,
    signal: AbortSignal,
    abort: AbortController,
  ): Promise<PreparedClip> => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let didTimeOut = false;
    const timedOut = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        didTimeOut = true;
        abort.abort();
        reject(new ListeningAudioControllerError(
          "load-failed",
          "Listening audio preparation timed out",
        ));
      }, options.preparationTimeoutMs);
    });
    try {
      return await Promise.race([
        options.preparation.prepare(reference, signal).then((clip) => {
          if (!signal.aborted) return clip;
          options.preparation.release(clip);
          throw new ListeningAudioControllerError(
            "cancelled",
            "Listening audio preparation was cancelled",
          );
        }),
        timedOut,
      ]);
    } catch (error) {
      if (didTimeOut) {
        throw new ListeningAudioControllerError(
          "load-failed",
          "Listening audio preparation timed out",
          error,
        );
      }
      throw error;
    } finally {
      if (timeout) clearTimeout(timeout);
    }
  };

  const startPreloads = (itemPosition: number): void => {
    for (let position = itemPosition + 1; position <= Math.min(
      clips.size - 1,
      itemPosition + options.preloadAhead,
    ); position += 1) {
      if (prepared.has(position) || preloadAborts.has(position)) continue;
      const reference = clips.get(position);
      if (!reference) continue;
      const abort = new AbortController();
      preloadAborts.set(position, abort);
      void prepareWithTimeout(reference, abort.signal, abort)
        .then((clip) => {
          if (destroyed || abort.signal.aborted || !preparationWindow.has(position)) {
            options.preparation.release(clip);
            return;
          }
          prepared.set(position, clip);
        })
        .catch(() => undefined)
        .finally(() => {
          if (preloadAborts.get(position) === abort) preloadAborts.delete(position);
        });
    }
  };

  const setPreparationWindow = (itemPosition: number): void => {
    preparationWindow = new Set(Array.from(
      { length: Math.min(clips.size - itemPosition, options.preloadAhead + 1) },
      (_unused, offset) => itemPosition + offset,
    ));
    for (const [position, clip] of prepared) {
      if (preparationWindow.has(position)) continue;
      options.preparation.release(clip);
      prepared.delete(position);
    }
    for (const [position, abort] of preloadAborts) {
      if (preparationWindow.has(position)) continue;
      abort.abort();
      preloadAborts.delete(position);
    }
  };

  const prepare = async (itemPosition: number): Promise<ListeningAudioSnapshot> => {
    const reference = referenceAt(itemPosition);
    cancelActive();
    setPreparationWindow(itemPosition);
    const speculativeAbort = preloadAborts.get(itemPosition);
    speculativeAbort?.abort();
    preloadAborts.delete(itemPosition);
    if (prepared.has(itemPosition)) {
      state = Object.freeze({ status: "ready", activeItemPosition: itemPosition });
      startPreloads(itemPosition);
      return snapshot();
    }
    const operationGeneration = generation;
    const abort = new AbortController();
    activeAbort = abort;
    state = Object.freeze({ status: "loading", activeItemPosition: itemPosition });
    try {
      const clip = await prepareWithTimeout(reference, abort.signal, abort);
      if (destroyed || operationGeneration !== generation || abort.signal.aborted) {
        options.preparation.release(clip);
        return snapshot();
      }
      prepared.set(itemPosition, clip);
      activeAbort = undefined;
      state = Object.freeze({ status: "ready", activeItemPosition: itemPosition });
      startPreloads(itemPosition);
      return snapshot();
    } catch (error) {
      const failure = toControllerError(
        error,
        "load-failed",
        "Listening audio could not be prepared",
      );
      if (
        destroyed
        || operationGeneration !== generation
        || (abort.signal.aborted && failure.code === "cancelled")
      ) {
        return snapshot();
      }
      activeAbort = undefined;
      recordFailure(itemPosition, failure);
      throw failure;
    }
  };

  const playPrepared = async (
    itemPosition: number,
    replay: boolean,
  ): Promise<ListeningAudioSnapshot> => {
    referenceAt(itemPosition);
    if (muted) {
      const failure = new ListeningAudioControllerError(
        "muted",
        "Listening audio is muted",
      );
      recordFailure(itemPosition, failure);
      throw failure;
    }
    if (!prepared.has(itemPosition)) {
      await prepare(itemPosition);
    } else {
      cancelActive();
      state = Object.freeze({ status: "ready", activeItemPosition: itemPosition });
    }
    assertActive();
    if (muted) {
      const failure = new ListeningAudioControllerError(
        "muted",
        "Listening audio is muted",
      );
      recordFailure(itemPosition, failure);
      throw failure;
    }
    if (
      state.status !== "ready" && state.status !== "completed"
      || state.activeItemPosition !== itemPosition
    ) return snapshot();
    const clip = prepared.get(itemPosition);
    if (!clip) return snapshot();

    cancelActive();
    const operationGeneration = generation;
    const abort = new AbortController();
    activeAbort = abort;
    state = Object.freeze({ status: "playing", activeItemPosition: itemPosition });
    try {
      restoreDucking = options.ducking.duck();
    } catch (error) {
      activeAbort = undefined;
      const failure = toControllerError(
        error,
        "playback-failed",
        "Listening audio could not lower background audio",
      );
      recordFailure(itemPosition, failure);
      throw failure;
    }
    let playbackTimedOut = false;
    try {
      let timeout: ReturnType<typeof setTimeout> | undefined;
      try {
        await Promise.race([
          options.playback.play(clip, abort.signal),
          new Promise<never>((_resolve, reject) => {
            timeout = setTimeout(() => {
              playbackTimedOut = true;
              abort.abort();
              reject(new ListeningAudioControllerError(
                "playback-failed",
                "Listening audio playback timed out",
              ));
            }, playbackTimeoutMs);
          }),
        ]);
      } catch (error) {
        if (playbackTimedOut) {
          throw new ListeningAudioControllerError(
            "playback-failed",
            "Listening audio playback timed out",
            error,
          );
        }
        throw error;
      } finally {
        if (timeout) clearTimeout(timeout);
      }
      if (
        destroyed
        || operationGeneration !== generation
        || (abort.signal.aborted && !playbackTimedOut)
      ) {
        return snapshot();
      }
      activeAbort = undefined;
      restoreBackgroundAudio();
      if (replay) replayCounts.set(itemPosition, (replayCounts.get(itemPosition) ?? 0) + 1);
      state = Object.freeze({ status: "completed", activeItemPosition: itemPosition });
      return snapshot();
    } catch (error) {
      restoreBackgroundAudio();
      if (
        destroyed
        || operationGeneration !== generation
        || (abort.signal.aborted && !playbackTimedOut)
      ) {
        return snapshot();
      }
      activeAbort = undefined;
      const failure = toControllerError(
        error,
        "playback-failed",
        "Listening audio playback failed",
      );
      recordFailure(itemPosition, failure);
      throw failure;
    }
  };

  const recordPosition = (itemPosition: number, target: Set<number>): void => {
    referenceAt(itemPosition);
    target.add(itemPosition);
  };

  return Object.freeze({
    prepare,
    play(itemPosition: number): Promise<ListeningAudioSnapshot> {
      return playPrepared(itemPosition, false);
    },
    replay(itemPosition: number): Promise<ListeningAudioSnapshot> {
      return playPrepared(itemPosition, true);
    },
    recordTranscriptAssistance(itemPosition: number): void {
      recordPosition(itemPosition, assistance);
    },
    recordReadingFallback(itemPosition: number): void {
      assertActive();
      if (session.scored) {
        throw new ListeningAudioControllerError(
          "scored-fallback-forbidden",
          "Scored listening cannot become reading fallback",
        );
      }
      recordPosition(itemPosition, fallbacks);
    },
    setMuted(nextMuted: boolean): void {
      assertActive();
      muted = nextMuted;
      if (!muted) return;
      cancelActive();
      state = Object.freeze({
        status: "cancelled",
        ...(state.activeItemPosition === undefined
          ? {}
          : { activeItemPosition: state.activeItemPosition }),
      });
    },
    pause(): void {
      assertActive();
      cancelActive();
      cancelPreloads();
      state = Object.freeze({
        status: "cancelled",
        ...(state.activeItemPosition === undefined
          ? {}
          : { activeItemPosition: state.activeItemPosition }),
      });
    },
    restart(): void {
      assertActive();
      cancelActive();
      cancelPreloads();
      releasePrepared();
      assistance.clear();
      fallbacks.clear();
      replayCounts.clear();
      failures.clear();
      state = Object.freeze({ status: "idle" });
    },
    destroy(): void {
      if (destroyed) return;
      cancelActive();
      cancelPreloads();
      releasePrepared();
      destroyed = true;
      state = Object.freeze({ status: "destroyed" });
    },
    getSnapshot: snapshot,
    getEvidence(): ListeningEvidence {
      const evidence = {
        schemaVersion: 1 as const,
        declaredModality: "listen-to-select" as const,
        effectiveModality: fallbacks.size > 0
          ? "reading-fallback" as const
          : "listen-to-select" as const,
        sourceLocale: session.sourceLocale,
        targetLocale: session.targetLocale,
        itemCount: clips.size,
        assistedItemPositions: [...assistance].sort((left, right) => left - right),
        fallbackItemPositions: [...fallbacks].sort((left, right) => left - right),
        replayCounts: [...replayCounts]
          .sort(([left], [right]) => left - right)
          .map(([itemPosition, count]) => ({ itemPosition, count })),
        audioFailures: [...failures]
          .sort(([left], [right]) => left - right)
          .map(([itemPosition, code]) => ({ itemPosition, code })),
      };
      return listeningEvidenceSchema.parse(evidence);
    },
  });
}
