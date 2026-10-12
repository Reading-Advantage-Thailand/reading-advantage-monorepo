/**
 * Playback position of the read-along (track primary_parity_read_along_20261011, Phase S1).
 * Pure functions: they find the sentence and the audio word for a time.
 */
import type { ReadAlongSentence } from "./align";

/** The sentence and the audio word that the voice says; -1 means none. */
export interface ReadAlongPosition {
  sentenceIndex: number;
  /** Index into `sentences[sentenceIndex].words`, not a screen word index. */
  wordIndex: number;
}

/** The position before the voice starts. */
export const NO_POSITION: ReadAlongPosition = { sentenceIndex: -1, wordIndex: -1 };

/** Seconds before the first word of a sentence in which that word already lights. */
export const LEAD_IN_SECONDS = 0.3;

/**
 * Finds the sentence and the audio word for a playback time.
 * @param sentences The sentence entries in order.
 * @param time The playback time in seconds.
 * @param previous The last position; the function returns it when nothing changed.
 * @returns The position; the last word and sentence stay in a gap.
 */
export function findPosition(
  sentences: ReadAlongSentence[],
  time: number,
  previous: ReadAlongPosition,
): ReadAlongPosition {
  throw new Error("not implemented");
}
