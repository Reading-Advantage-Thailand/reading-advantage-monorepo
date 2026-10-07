import {
  ListeningAudioControllerError,
  type AudioClipPlaybackPort,
  type AudioClipPreparationPort,
  type ListeningAudioClipReference,
} from "./contracts.js";

/** Prepared browser audio element for one URL clip. */
export interface BrowserPreparedAudioClip {
  /** Original indexed clip reference. */
  readonly reference: ListeningAudioClipReference;
  /** Native browser audio element. */
  readonly element: HTMLAudioElement;
}

/** Optional native element factory for browser tests and alternate documents. */
export interface BrowserAudioClipPortOptions {
  /** Creates one native audio element. */
  readonly createAudio?: () => HTMLAudioElement;
}

/** Native preparation and playback ports for browser URL clips. */
export interface BrowserAudioClipPorts {
  /** Native URL clip preparation port. */
  readonly preparation: AudioClipPreparationPort<BrowserPreparedAudioClip>;
  /** Native prepared element playback port. */
  readonly playback: AudioClipPlaybackPort<BrowserPreparedAudioClip>;
}

/**
 * Creates native browser ports for URL-backed prompt audio.
 * @param options Optional audio element factory.
 * @returns Provider-neutral ports backed by native audio elements.
 */
export function createBrowserAudioClipPorts(
  options: BrowserAudioClipPortOptions = {},
): BrowserAudioClipPorts {
  const createAudio = options.createAudio ?? (() => new Audio());
  // Clips with one URL share one element: up to 50 word segments can come from one article file.
  const shared = new Map<string, { element: HTMLAudioElement; users: number; ready: Promise<void>; stop: () => void }>();
  const dispose = (url: string): void => {
    const entry = shared.get(url);
    if (!entry || --entry.users > 0) return;
    shared.delete(url);
    entry.stop();
    entry.element.pause();
    entry.element.currentTime = 0;
    entry.element.removeAttribute("src");
    entry.element.load();
  };
  const load = (url: string): { element: HTMLAudioElement; ready: Promise<void> } => {
    const existing = shared.get(url);
    if (existing) {
      existing.users += 1;
      return existing;
    }
    const element = createAudio();
    element.preload = "auto";
    element.src = url;
    let stop = (): void => undefined;
    const ready = new Promise<void>((resolve, reject) => {
      const cleanup = (): void => {
        element.removeEventListener("canplay", handleReady);
        element.removeEventListener("error", handleError);
      };
      stop = cleanup;
      const handleReady = (): void => {
        cleanup();
        resolve();
      };
      const handleError = (): void => {
        cleanup();
        reject(new ListeningAudioControllerError(
          "load-failed",
          "Browser audio could not load the prompt URL",
        ));
      };
      element.addEventListener("canplay", handleReady);
      element.addEventListener("error", handleError);
    });
    // A failed or abandoned load must not stay unhandled while no clip waits on it.
    ready.catch(() => undefined);
    shared.set(url, { element, users: 1, ready, stop });
    element.load();
    return { element, ready };
  };
  return Object.freeze({
    preparation: Object.freeze({
      prepare(
        reference: ListeningAudioClipReference,
        signal: AbortSignal,
      ): Promise<BrowserPreparedAudioClip> {
        if (signal.aborted) {
          return Promise.reject(new ListeningAudioControllerError(
            "cancelled",
            "Listening audio preparation was cancelled",
          ));
        }
        const { element, ready } = load(reference.url);
        return new Promise((resolve, reject) => {
          const handleAbort = (): void => {
            dispose(reference.url);
            reject(new ListeningAudioControllerError(
              "cancelled",
              "Listening audio preparation was cancelled",
            ));
          };
          signal.addEventListener("abort", handleAbort, { once: true });
          ready.then(() => {
            if (signal.aborted) return;
            signal.removeEventListener("abort", handleAbort);
            resolve(Object.freeze({ reference, element }));
          }, (error: unknown) => {
            if (signal.aborted) return;
            signal.removeEventListener("abort", handleAbort);
            dispose(reference.url);
            reject(error);
          });
        });
      },
      release(clip: BrowserPreparedAudioClip): void {
        const entry = shared.get(clip.reference.url);
        if (entry?.element !== clip.element) {
          clip.element.pause();
          return;
        }
        // Another clip still uses the element: stop this one only.
        if (entry.users > 1) clip.element.pause();
        dispose(clip.reference.url);
      },
    }),
    playback: Object.freeze({
      play(clip: BrowserPreparedAudioClip, signal: AbortSignal): Promise<void> {
        if (signal.aborted) {
          return Promise.reject(new ListeningAudioControllerError(
            "cancelled",
            "Listening audio playback was cancelled",
          ));
        }
        const { element, reference } = clip;
        const end = reference.endSeconds;
        element.currentTime = reference.startSeconds ?? 0;
        return new Promise((resolve, reject) => {
          let stopTimer: ReturnType<typeof setTimeout> | undefined;
          const cleanup = (): void => {
            if (stopTimer !== undefined) clearTimeout(stopTimer);
            element.removeEventListener("ended", handleEnded);
            element.removeEventListener("error", handleError);
            element.removeEventListener("playing", handlePlaying);
            element.removeEventListener("timeupdate", handleTimeUpdate);
            signal.removeEventListener("abort", handleAbort);
          };
          const handleEnded = (): void => {
            cleanup();
            resolve();
          };
          // A segment of a longer file stops at its end: a timer from the moment playback runs,
          // and the coarser timeupdate event as a backup.
          const handleSegmentEnd = (): void => {
            cleanup();
            element.pause();
            resolve();
          };
          const handlePlaying = (): void => {
            if (end === undefined) return;
            if (stopTimer !== undefined) clearTimeout(stopTimer);
            stopTimer = setTimeout(handleSegmentEnd, Math.max(0, (end - element.currentTime) * 1000));
          };
          const handleTimeUpdate = (): void => {
            if (end !== undefined && element.currentTime >= end) handleSegmentEnd();
          };
          const handleError = (): void => {
            cleanup();
            reject(new ListeningAudioControllerError(
              "playback-failed",
              "Browser audio failed during prompt playback",
            ));
          };
          const handleAbort = (): void => {
            cleanup();
            element.pause();
            reject(new ListeningAudioControllerError(
              "cancelled",
              "Listening audio playback was cancelled",
            ));
          };
          element.addEventListener("ended", handleEnded);
          element.addEventListener("error", handleError);
          element.addEventListener("playing", handlePlaying);
          element.addEventListener("timeupdate", handleTimeUpdate);
          signal.addEventListener("abort", handleAbort, { once: true });
          void element.play().catch((error: unknown) => {
            cleanup();
            reject(new ListeningAudioControllerError(
              "playback-failed",
              "Browser rejected prompt audio playback",
              error,
            ));
          });
        });
      },
    }),
  });
}
