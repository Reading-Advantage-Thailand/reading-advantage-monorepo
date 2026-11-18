"use client";

/**
 * The word clip buttons of the teacher views (plan task 6.2, round 3).
 *
 * The Workbooks clip maps give a whole clip file to a word of the opening routine, of the family
 * words, or of the tricky words. A tap on such a word plays its own clip from the start, with no
 * seek and no stop timer (the order of 2026-11-13: no sliced audio).
 *
 * The provider holds the one audio element of the view, so one clip plays at a time: a new tap
 * replaces the clip of the element, and no two clips overlap.
 */
import { createContext, useCallback, useContext, useRef, type ReactNode } from "react";

import { mediaUrl } from "./media/url";

/** The play function of the shared clip player. */
type PlayClip = (file: string) => void;

/** The context of the shared clip player. */
const ClipPlayerContext = createContext<PlayClip | null>(null);

/**
 * Holds the one audio element of a teacher view, so one clip plays at a time.
 * @param props.children The parts of the view.
 * @param props.mediaUrls The signed URLs of the week.
 * @returns The parts of the view and the audio element.
 */
export function ClipPlayerProvider({
  children,
  mediaUrls,
}: {
  children: ReactNode;
  mediaUrls: Record<string, string>;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const play = useCallback(
    (file: string) => {
      const target = audioRef.current;
      if (!target) return;
      const url = mediaUrl(mediaUrls, file);
      if (url === "") return;
      target.src = url;
      const result = target.play();
      if (result && typeof result.catch === "function") result.catch(() => undefined);
    },
    [mediaUrls],
  );
  return (
    <ClipPlayerContext.Provider value={play}>
      {children}
      <audio ref={audioRef} preload="none" />
    </ClipPlayerContext.Provider>
  );
}

/**
 * The button of one word that holds a whole clip.
 * @param props.file The clip file of the word.
 * @param props.className The class of the button.
 * @param props.children The word of the button.
 * @returns The button.
 */
export function WordClipButton({
  file,
  className,
  children,
}: {
  file: string;
  className?: string;
  children: ReactNode;
}) {
  const play = useContext(ClipPlayerContext);
  return (
    <button
      type="button"
      onClick={() => play?.(file)}
      className={`min-h-11 min-w-11 ${className ?? ""}`.trim()}
      lang="en"
    >
      {children}
    </button>
  );
}
