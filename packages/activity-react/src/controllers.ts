/** Snapshot emitted by every media provider controller. */
export type MediaSnapshot = {
  status: "idle" | "ready" | "playing" | "paused" | "ended" | "error";
  currentSeconds: number;
  durationSeconds: number;
  captionsEnabled: boolean;
  errorMessage?: string;
};

/** Provider-neutral playback controller consumed by React. */
export interface MediaController {
  /** Returns the latest synchronous snapshot. */
  getSnapshot(): MediaSnapshot;
  /** Subscribes to provider state changes. */
  subscribe(listener: (snapshot: MediaSnapshot) => void): () => void;
  /** Starts or resumes playback. */
  play(): void | Promise<void>;
  /** Pauses playback. */
  pause(): void;
  /** Seeks to an authoritative activity timestamp. */
  seek(seconds: number): void;
  /** Releases provider listeners and resources. */
  destroy(): void;
}

/**
 * Resolves provider policy without permitting an unapproved hard gate.
 * @param provider Authored media provider.
 * @param requested Authored checkpoint gate.
 * @param hostedApproved Whether hosted hard-gate approval metadata exists.
 * @returns Executable player gate policy.
 */
export function resolveCheckpointPolicy(
  provider: "youtube" | "hosted",
  requested: "pause_non_blocking" | "answer_before_continue",
  hostedApproved: boolean,
): "pause_non_blocking" | "answer_before_continue" {
  return provider === "hosted" && requested === "answer_before_continue" && hostedApproved
    ? "answer_before_continue"
    : "pause_non_blocking";
}

/**
 * Merges overlapping watched ranges for bounded persistence batches.
 * @param ranges Untrusted or sampled watched intervals.
 * @returns Sorted non-overlapping intervals.
 */
export function mergeWatchedRanges(
  ranges: Array<{ startSeconds: number; endSeconds: number }>,
): Array<{ startSeconds: number; endSeconds: number }> {
  return [...ranges]
    .filter((range) => range.endSeconds > range.startSeconds)
    .sort((left, right) => left.startSeconds - right.startSeconds)
    .reduce<Array<{ startSeconds: number; endSeconds: number }>>((merged, range) => {
      const previous = merged.at(-1);
      if (previous && range.startSeconds <= previous.endSeconds) previous.endSeconds = Math.max(previous.endSeconds, range.endSeconds);
      else merged.push({ ...range });
      return merged;
    }, []);
}

/**
 * Finds forward cue crossings between two provider samples.
 * @param previousSeconds Previous sampled position.
 * @param currentSeconds Current sampled position.
 * @param cueSeconds Sorted or unsorted cue positions.
 * @returns Cues crossed in ascending order.
 */
export function sampleCueCrossings(previousSeconds: number, currentSeconds: number, cueSeconds: number[]): number[] {
  if (currentSeconds <= previousSeconds) return [];
  return cueSeconds.filter((cue) => cue > previousSeconds && cue <= currentSeconds).sort((left, right) => left - right);
}

/** Minimal YouTube IFrame API surface supplied by a host adapter. */
export interface YouTubePlayerPort {
  /** Starts video playback. */
  playVideo(): void;
  /** Pauses video playback. */
  pauseVideo(): void;
  /** Seeks to a position without inventing timestamps. */
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  /** Reads the current playback position. */
  getCurrentTime(): number;
  /** Reads the media duration. */
  getDuration(): number;
  /** Destroys the iframe player. */
  destroy(): void;
}

/**
 * Wraps the YouTube IFrame API behind the provider-neutral controller.
 * @param player Host-created YouTube player port.
 * @returns Media controller with explicit polling notifications.
 */
export function createYouTubeMediaController(player: YouTubePlayerPort): MediaController & { refresh(): void } {
  let snapshot: MediaSnapshot = { status: "ready", currentSeconds: player.getCurrentTime(), durationSeconds: player.getDuration(), captionsEnabled: false };
  let pendingSeek: { seconds: number; refreshesRemaining: number } | undefined;
  const listeners = new Set<(value: MediaSnapshot) => void>();
  const publish = (): void => listeners.forEach((listener) => listener(snapshot));
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    play: () => { player.playVideo(); snapshot = { ...snapshot, status: "playing" }; publish(); },
    pause: () => { player.pauseVideo(); snapshot = { ...snapshot, status: "paused" }; publish(); },
    seek: (seconds) => {
      player.seekTo(seconds, true);
      pendingSeek = { seconds, refreshesRemaining: 4 };
      snapshot = { ...snapshot, currentSeconds: seconds };
      publish();
    },
    refresh: () => {
      const providerSeconds = player.getCurrentTime();
      if (pendingSeek && Math.abs(providerSeconds - pendingSeek.seconds) <= 0.75) pendingSeek = undefined;
      else if (pendingSeek && pendingSeek.refreshesRemaining > 0) pendingSeek.refreshesRemaining -= 1;
      else pendingSeek = undefined;
      snapshot = {
        ...snapshot,
        currentSeconds: pendingSeek?.seconds ?? providerSeconds,
        durationSeconds: player.getDuration(),
      };
      publish();
    },
    destroy: () => { listeners.clear(); player.destroy(); },
  };
}

/**
 * Wraps hosted HTML media without introducing framework or provider dependencies.
 * @param media HTML audio or video element.
 * @returns Provider-neutral media controller.
 */
export function createHostedMediaController(media: HTMLMediaElement): MediaController {
  let snapshot: MediaSnapshot = { status: "idle", currentSeconds: media.currentTime, durationSeconds: Number.isFinite(media.duration) ? media.duration : 0, captionsEnabled: false };
  const listeners = new Set<(value: MediaSnapshot) => void>();
  const refresh = (): void => {
    snapshot = {
      ...snapshot,
      status: media.ended ? "ended" : media.paused ? "paused" : "playing",
      currentSeconds: media.currentTime,
      durationSeconds: Number.isFinite(media.duration) ? media.duration : 0,
    };
    listeners.forEach((listener) => listener(snapshot));
  };
  media.addEventListener("timeupdate", refresh);
  media.addEventListener("play", refresh);
  media.addEventListener("pause", refresh);
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    play: () => media.play(),
    pause: () => media.pause(),
    seek: (seconds) => { media.currentTime = seconds; refresh(); },
    destroy: () => {
      listeners.clear();
      media.removeEventListener("timeupdate", refresh);
      media.removeEventListener("play", refresh);
      media.removeEventListener("pause", refresh);
    },
  };
}
