"use client";
/**
 * The follow scroll of the read-along (track primary_parity_read_along_20261011, Phase S3).
 * It keeps the current sentence near 30 percent of the viewport height while the audio plays.
 */
import { useCallback, useEffect, useRef, type RefObject } from "react";

/** Where the sentence stays, as a share of the viewport height. */
export const FOLLOW_ANCHOR = 0.3;

/** Keys that scroll the page by hand. */
const SCROLL_KEYS = new Set(["PageUp", "PageDown", "Home", "End", "ArrowUp", "ArrowDown", " "]);

/**
 * Scrolls the page to the current sentence while the audio plays.
 * A wheel, a touch move, or a scroll key stops it until the next play or `resume()`.
 * @param options.targetRef The element of the current sentence.
 * @param options.enabled True while the audio plays.
 * @param options.sentenceIndex The current sentence; a change starts a scroll.
 * @returns `resume` starts the follow again, for example after a tap on a sentence.
 */
export function useFollowScroll({
  targetRef,
  enabled,
  sentenceIndex,
}: {
  targetRef: RefObject<HTMLElement | null>;
  enabled: boolean;
  sentenceIndex: number;
}): { resume: () => void } {
  const stoppedRef = useRef(false);

  useEffect(() => {
    const stop = () => {
      stoppedRef.current = true;
    };
    const onKey = (e: KeyboardEvent) => {
      // A key on a button (for example Space on Play) does not scroll the page.
      if (SCROLL_KEYS.has(e.key) && !(e.target as Element | null)?.closest?.("button")) stop();
    };
    // A press on the scroll bar is a scroll by hand.
    const onPointer = (e: MouseEvent) => {
      const { clientWidth } = document.documentElement;
      if (window.innerWidth > clientWidth && e.clientX >= clientWidth) stop();
    };
    // A text selection drag is a scroll by hand.
    const onSelection = () => {
      if (window.getSelection()?.isCollapsed === false) stop();
    };
    window.addEventListener("wheel", stop, { passive: true });
    window.addEventListener("touchmove", stop, { passive: true });
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onPointer);
    document.addEventListener("selectionchange", onSelection);
    return () => {
      window.removeEventListener("wheel", stop);
      window.removeEventListener("touchmove", stop);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("selectionchange", onSelection);
    };
  }, []);

  // A new play starts the follow again, even after a scroll by hand while paused.
  useEffect(() => {
    if (enabled) stoppedRef.current = false;
  }, [enabled]);

  useEffect(() => {
    const el = targetRef.current;
    if (!enabled || sentenceIndex < 0 || stoppedRef.current || !el) return;
    const { top } = el.getBoundingClientRect();
    const height = window.innerHeight;
    // Leave the text alone while the sentence is in the upper half.
    if (top >= height * 0.1 && top <= height * 0.5) return;
    window.scrollTo({ top: top + window.scrollY - height * FOLLOW_ANCHOR, behavior: "smooth" });
  }, [targetRef, enabled, sentenceIndex]);

  const resume = useCallback(() => {
    stoppedRef.current = false;
  }, []);

  return { resume };
}
