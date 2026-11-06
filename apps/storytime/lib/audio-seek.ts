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
 * @returns A cancel function that drops a queued `onReady`; it is a no-op when the callback
 *   already ran. A caller runs it when playback never starts, so a rejected play does not
 *   leave a queued stop arm (finding F241).
 */
export function seekAndRun(
  audio: HTMLAudioElement,
  time: number,
  onReady: () => void,
): () => void {
  if (seekOrWait(audio, time)) {
    onReady();
    return () => {};
  }
  const runOnReady = (): void => {
    audio.removeEventListener("loadedmetadata", runOnReady);
    onReady();
  };
  audio.addEventListener("loadedmetadata", runOnReady, { once: true });
  try {
    audio.currentTime = time;
  } catch {
    // The seek applies on the loadedmetadata event.
  }
  return () => audio.removeEventListener("loadedmetadata", runOnReady);
}

/**
 * Arms a stop that fires only when the media clock reaches `end`.
 *
 * A wall-clock timer of the remaining time fires before `currentTime` reaches the cut end:
 * the media clock starts to move only after the audio renders, tens of milliseconds after
 * `playing` (finding F140). When the timer fires while `currentTime` is still below `end`,
 * the helper re-arms for the remaining media time, so the pause lands at the measured cut
 * end on real devices and also after a stall in the middle of the word.
 *
 * The loop ends by itself when the media stops below the cut end (finding F145): a `pause`,
 * `ended`, or `error` event ends the loop, removes the listeners, and runs `onStop` once, so
 * the caller clears the mark of a cut that can no longer play to its end. `onStop` runs on
 * such an end because both callers clear their mark in it; a paused or ended element must
 * leave no stale mark.
 *
 * One loop lives per element (finding F146): a new arm replaces the previous loop of the
 * same element, so a caller that loses the previous cancel function cannot leak a loop that
 * pauses a later cut or outlives the component. The previous `onStop` does not run on such a
 * replacement; the new playback owns the mark.
 *
 * A terminal `pause` ends the loop and clears the mark (F145), but playback can resume below
 * the cut end (the child presses play again), so the pause keeps a one-shot `play` listener
 * that re-arms the loop while `currentTime` is below the end (finding F148). The helper holds
 * that listener per element: a cancel and a replacement remove it, including the listener of
 * a loop that already finished and left the active map (finding F153). It does nothing when a
 * newer loop owns the element or the clock is already past the end.
 * @param audio The media element to stop.
 * @param end The cut end, in seconds on the media clock.
 * @param onStop The stop action that runs when the media clock reaches `end` or the media
 *   stops below it.
 * @returns A cancel function that clears the pending timer and the listeners; the caller
 *   must run it on cleanup and on a new playback.
 */
const activeStops = new WeakMap<HTMLMediaElement, () => void>();
/** The one-shot resume listener of a terminally paused loop, per element (findings F148, F153). */
const pendingResumes = new WeakMap<HTMLMediaElement, () => void>();
const TERMINAL_STOP_EVENTS = ["pause", "ended", "error"] as const;

export function stopAtMediaEnd(audio: HTMLMediaElement, end: number, onStop: () => void): () => void {
  // A finished loop leaves `activeStops`, but it can still hold a one-shot resume listener
  // from its terminal pause; a new loop removes it here, so it cannot re-arm the old loop
  // after the new one ends (finding F153).
  const staleResume = pendingResumes.get(audio);
  if (staleResume) {
    staleResume();
    pendingResumes.delete(audio);
  }
  activeStops.get(audio)?.();
  let timer: ReturnType<typeof setTimeout> | null = null;
  let finished = false;
  let resumeDetach: (() => void) | null = null;
  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };
  const detachResume = (): void => {
    if (resumeDetach !== null) {
      resumeDetach();
      if (pendingResumes.get(audio) === resumeDetach) pendingResumes.delete(audio);
      resumeDetach = null;
    }
  };
  function detachAll(): void {
    for (const type of TERMINAL_STOP_EVENTS) audio.removeEventListener(type, onTerminal);
    detachResume();
    if (activeStops.get(audio) === cancel) activeStops.delete(audio);
  }
  function rearm(): void {
    finished = false;
    for (const type of TERMINAL_STOP_EVENTS) audio.addEventListener(type, onTerminal);
    activeStops.set(audio, cancel);
    arm(Math.max(0, Math.round((end - audio.currentTime) * 1000)));
  }
  function onResume(): void {
    detachResume();
    if (activeStops.get(audio) !== undefined) return;
    if (audio.currentTime >= end) return;
    rearm();
  }
  /** Keeps the one-shot resume listener after a terminal pause (finding F148). */
  function keepResume(): void {
    if (resumeDetach !== null) return;
    audio.addEventListener("play", onResume, { once: true });
    resumeDetach = () => audio.removeEventListener("play", onResume);
    pendingResumes.set(audio, resumeDetach);
  }
  function finish(): void {
    if (finished) return;
    finished = true;
    clearTimer();
    detachAll();
    onStop();
  }
  function onTerminal(event: Event): void {
    finish();
    if (event.type === "pause") keepResume();
  }
  function cancel(): void {
    clearTimer();
    detachAll();
    finished = true;
  }
  function arm(delayMs: number): void {
    timer = setTimeout(() => {
      timer = null;
      const remainingMs = Math.round((end - audio.currentTime) * 1000);
      if (remainingMs > 0) {
        arm(Math.max(5, remainingMs));
        return;
      }
      finish();
    }, Math.max(0, delayMs));
  }
  for (const type of TERMINAL_STOP_EVENTS) audio.addEventListener(type, onTerminal);
  activeStops.set(audio, cancel);
  arm(Math.max(0, Math.round((end - audio.currentTime) * 1000)));
  return cancel;
}
