/**
 * Playback position of the read-along (track primary_parity_read_along_20261011, Phase S1).
 * Pure functions: they find the sentence and the audio word for a time.
 */
import { SEEK_EPSILON } from "@/lib/audio-highlight";
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
 * A start within `SEEK_EPSILON` after the time counts as reached: a seek lands that far before it.
 */
export function findPosition(
  sentences: ReadAlongSentence[],
  time: number,
  previous: ReadAlongPosition,
): ReadAlongPosition {
  let sentenceIndex = -1;
  for (let i = 0; i < sentences.length; i++) if (sentences[i].startTime <= time + SEEK_EPSILON) sentenceIndex = i;
  let wordIndex = -1;
  if (sentenceIndex >= 0) {
    const words = sentences[sentenceIndex].words;
    for (let j = 0; j < words.length; j++) if (words[j].start <= time + SEEK_EPSILON) wordIndex = j;
    if (wordIndex === -1 && words.length > 0 && words[0].start - time <= LEAD_IN_SECONDS) wordIndex = 0;
  }
  if (sentenceIndex === previous.sentenceIndex && wordIndex === previous.wordIndex) return previous;
  return sentenceIndex === -1 ? NO_POSITION : { sentenceIndex, wordIndex };
}

/**
 * Gives the playback time that starts a sentence.
 * @param sentence The sentence entry.
 * @returns The start time minus `SEEK_EPSILON`, never below 0.
 */
export function seekTimeForSentence(sentence: ReadAlongSentence): number {
  return Math.max(0, sentence.startTime - SEEK_EPSILON);
}

/**
 * Gives the playback time that starts an audio word.
 * @param sentence The sentence entry.
 * @param audioWordIndex Index into `sentence.words`; -1 when the screen word has no audio word.
 * @returns The word start minus `SEEK_EPSILON`; the sentence start when the sentence has no such word.
 */
export function seekTimeForWord(sentence: ReadAlongSentence, audioWordIndex: number): number {
  const word = sentence.words[audioWordIndex];
  return word ? Math.max(0, word.start - SEEK_EPSILON) : seekTimeForSentence(sentence);
}
