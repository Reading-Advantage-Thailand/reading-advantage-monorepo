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
  let sentenceIndex = -1;
  for (let i = 0; i < sentences.length; i++) if (sentences[i].startTime <= time) sentenceIndex = i;
  let wordIndex = -1;
  if (sentenceIndex >= 0) {
    const words = sentences[sentenceIndex].words;
    for (let j = 0; j < words.length; j++) if (words[j].start <= time) wordIndex = j;
    if (wordIndex === -1 && words.length > 0 && words[0].start - time <= LEAD_IN_SECONDS) wordIndex = 0;
  }
  if (sentenceIndex === previous.sentenceIndex && wordIndex === previous.wordIndex) return previous;
  return sentenceIndex === -1 ? NO_POSITION : { sentenceIndex, wordIndex };
}
