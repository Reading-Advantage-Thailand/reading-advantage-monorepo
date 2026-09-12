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
        const element = createAudio();
        element.preload = "auto";
        element.src = reference.url;
        return new Promise((resolve, reject) => {
          const cleanup = (): void => {
            element.removeEventListener("canplay", handleReady);
            element.removeEventListener("error", handleError);
            signal.removeEventListener("abort", handleAbort);
          };
          const handleReady = (): void => {
            cleanup();
            resolve(Object.freeze({ reference, element }));
          };
          const handleError = (): void => {
            cleanup();
            reject(new ListeningAudioControllerError(
              "load-failed",
              "Browser audio could not load the prompt URL",
            ));
          };
          const handleAbort = (): void => {
            cleanup();
            element.pause();
            element.currentTime = 0;
            element.removeAttribute("src");
            element.load();
            reject(new ListeningAudioControllerError(
              "cancelled",
              "Listening audio preparation was cancelled",
            ));
          };
          element.addEventListener("canplay", handleReady);
          element.addEventListener("error", handleError);
          signal.addEventListener("abort", handleAbort, { once: true });
          element.load();
        });
      },
      release(clip: BrowserPreparedAudioClip): void {
        clip.element.pause();
        clip.element.currentTime = 0;
        clip.element.removeAttribute("src");
        clip.element.load();
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
        const { element } = clip;
        element.currentTime = 0;
        return new Promise((resolve, reject) => {
          const cleanup = (): void => {
            element.removeEventListener("ended", handleEnded);
            element.removeEventListener("error", handleError);
            signal.removeEventListener("abort", handleAbort);
          };
          const handleEnded = (): void => {
            cleanup();
            resolve();
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
