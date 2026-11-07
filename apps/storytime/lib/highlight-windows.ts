/**
 * The highlight windows of the read-along (spec FR-1, AC-1.11, plan task 1.9).
 *
 * A short word ("a", "am") has a recorded window of 80 to 100 ms, which is less than a frame
 * budget a child can see. The highlight gives each word a window of at least `MIN_WORD_WINDOW_S`,
 * and the missing time comes from the next word: its window starts later. The function feeds only
 * the highlight. The cut bounds of a word and the page stop keep the recorded timings.
 */

/** The shortest visible window of one highlighted word, in seconds. */
export const MIN_WORD_WINDOW_S = 0.12;

/** One window of a highlighted word, in seconds. */
export interface HighlightWindow {
  /** The time at which the word lights. */
  start: number;
  /** The time at which the word goes dark. */
  end: number;
}

/**
 * Gives each word of one sentence a highlight window that lasts at least the minimum time.
 * @param words The recorded words of the sentence, in reading order.
 * @param minSeconds The shortest window, in seconds.
 * @returns One window for each word, in the same order. A window never starts before its word,
 * never overlaps the window before it, and lasts at least `minSeconds`. A list of words that
 * already hold the minimum and do not overlap comes back unchanged.
 */
export function highlightWindows(
  words: readonly { start: number; end: number }[],
  minSeconds: number = MIN_WORD_WINDOW_S,
): HighlightWindow[] {
  let cursor = Number.NEGATIVE_INFINITY;
  return words.map((word) => {
    const start = Math.max(word.start, cursor);
    const end = Math.max(word.end, start + minSeconds);
    cursor = end;
    return { start, end };
  });
}
