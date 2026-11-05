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
