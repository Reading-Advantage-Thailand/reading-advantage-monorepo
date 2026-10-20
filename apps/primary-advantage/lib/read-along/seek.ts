/**
 * Seek helper for the read-along (track primary_parity_read_along_20261011).
 * A browser applies `currentTime` reliably only after the first metadata
 * loads; before that the seek is lost or throws. The reader therefore waits
 * for the `loadedmetadata` event when the element has not loaded metadata yet.
 */

/** ReadyState below which the media element has no usable metadata (HAVE_METADATA is 1). */
const HAVE_METADATA = 1;

/**
 * Seeks the media element to a playback time, or waits for the metadata first.
 *
 * When the element already has metadata, the seek happens at once and the
 * function returns true. When the element has no metadata (readyState 0),
 * the seek is applied on the next `loadedmetadata` event and the function
 * returns false.
 * @param audio The media element to seek.
 * @param time The playback time in seconds.
 * @returns True when the element seeked at once.
 */
export function seekOrWait(audio: HTMLAudioElement, time: number): boolean {
  if (audio.readyState < HAVE_METADATA) {
    const applySeek = () => {
      audio.currentTime = time;
    };
    audio.addEventListener("loadedmetadata", applySeek, { once: true });
    return false;
  }
  audio.currentTime = time;
  return true;
}
