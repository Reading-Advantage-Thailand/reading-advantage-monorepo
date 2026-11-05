/**
 * Seek helper for the Storytime audio elements (plan 3.7 remediation, findings F122 and F123).
 *
 * A browser applies `currentTime` reliably only after the first metadata loads
 * (`packages/read-along/lib/seek.ts`). `seekOrWait` re-applies the seek on the
 * `loadedmetadata` event when the element has no metadata yet.
 */
import { seekOrWait } from "@reading-advantage/read-along/lib/seek";

/**
 * Seeks the element and runs `onReady` once the seek is in place.
 *
 * When the element already has metadata, `seekOrWait` seeks at once and `onReady` runs at
 * once. When the element has no metadata, `seekOrWait` applies the seek on the
 * `loadedmetadata` event and `onReady` runs with it; the early seek attempt below also keeps
 * the browser default playback start position at the seek target. The committed reader
 * contract pins the applied word-cut seek at the tap.
 * @param audio The media element to seek.
 * @param time The playback time in seconds.
 * @param onReady The callback that runs when the seek is in place.
 */
export function seekAndRun(audio: HTMLAudioElement, time: number, onReady: () => void): void {
  if (seekOrWait(audio, time)) {
    onReady();
    return;
  }
  audio.addEventListener("loadedmetadata", onReady, { once: true });
  try {
    audio.currentTime = time;
  } catch {
    // The seek applies on the loadedmetadata event.
  }
}

/**
 * Arms a stop that fires only when the media clock reaches `end`.
 *
 * A wall-clock timer of the remaining time fires before `currentTime` reaches the cut end:
 * the media clock starts to move only after the audio renders, tens of milliseconds after
 * `playing` (finding F140). When the timer fires while `currentTime` is still below `end`,
 * the helper re-arms for the remaining media time, so the pause lands at the measured cut
 * end on real devices and also after a stall in the middle of the word.
 * @param audio The media element to stop.
 * @param end The cut end, in seconds on the media clock.
 * @param onStop The stop action that runs when the media clock reaches `end`.
 * @returns A cancel function that clears the pending timer; the caller must run it on
 *   cleanup and on a new playback.
 */
export function stopAtMediaEnd(audio: HTMLMediaElement, end: number, onStop: () => void): () => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const arm = (delayMs: number): void => {
    timer = setTimeout(() => {
      timer = null;
      const remainingMs = Math.round((end - audio.currentTime) * 1000);
      if (remainingMs > 0) {
        arm(Math.max(5, remainingMs));
        return;
      }
      onStop();
    }, Math.max(0, delayMs));
  };
  arm(Math.max(0, Math.round((end - audio.currentTime) * 1000)));
  return () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
}
