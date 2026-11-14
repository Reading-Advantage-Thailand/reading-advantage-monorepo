"use client";
/**
 * The read-along loop (track primary_parity_read_along_20261011, Phase S1).
 * One requestAnimationFrame callback for each frame while the audio plays, none while it is paused.
 */
import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { ReadAlongSentence } from "../lib/align";
import { findPosition, NO_POSITION, type ReadAlongPosition } from "../lib/position";

/** What the hook gives back. */
export interface ReadAlongState {
  /** The sentence and the audio word that the voice says. */
  position: ReadAlongPosition;
  /** True from the `play` event to the `pause` or `ended` event. */
  isPlaying: boolean;
  /** Sets the position at once, for example after a tap. */
  select: (position: ReadAlongPosition) => void;
  /** Clears the position, for example when the player closes. The late `pause` and `seeked`
   * events of that stop mark no word again; the mark returns on `play` or on a `select` call. */
  reset: () => void;
}

/**
 * Follows the playback position of an audio element.
 * @param options.audioRef The audio element of the page.
 * @param options.sentences The sentence entries with their word timings.
 * @returns The position, the playing flag, and two setters.
 */
export function useReadAlong({
  audioRef,
  sentences,
}: {
  audioRef: RefObject<HTMLAudioElement | null>;
  sentences: ReadAlongSentence[];
}): ReadAlongState {
  const [position, setPosition] = useState<ReadAlongPosition>(NO_POSITION);
  const [isPlaying, setIsPlaying] = useState(false);
  const positionRef = useRef<ReadAlongPosition>(NO_POSITION);
  // True between a `reset()` and the next `play` or `select`: a browser queues the `pause` and
  // `seeked` events of a stop after the host call, and their sync would mark a word again
  // (task 7.6, finding F2). A plain `pause` with no reset keeps its mark (Primary behavior).
  const suppressSyncRef = useRef(false);
  const sentencesRef = useRef(sentences);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    sentencesRef.current = sentences;
  }, [sentences]);

  const select = useCallback((next: ReadAlongPosition) => {
    suppressSyncRef.current = false;
    positionRef.current = next;
    setPosition(next);
  }, []);

  const reset = useCallback(() => {
    select(NO_POSITION);
    suppressSyncRef.current = true;
  }, [select]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const sync = () => {
      const next = findPosition(sentencesRef.current, audio.currentTime, positionRef.current);
      if (next !== positionRef.current) select(next);
    };
    // A cold element reports time 0; wait for the metadata before a paused sync. After a reset,
    // the late events of that stop do not sync (task 7.6, finding F2).
    const syncIfLoaded = () => {
      if (suppressSyncRef.current) return;
      if (audio.readyState >= 1) sync();
    };
    const stop = () => {
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
    };
    const tick = () => {
      sync();
      frameRef.current = requestAnimationFrame(tick);
    };
    const onPlay = () => {
      suppressSyncRef.current = false;
      setIsPlaying(true);
      stop();
      frameRef.current = requestAnimationFrame(tick);
    };
    const onPause = () => {
      stop();
      setIsPlaying(false);
      syncIfLoaded();
    };
    const onEnded = () => {
      stop();
      setIsPlaying(false);
      select(NO_POSITION);
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("seeked", syncIfLoaded);
    return () => {
      stop();
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("seeked", syncIfLoaded);
    };
  }, [audioRef, select]);

  return { position, isPlaying, select, reset };
}
