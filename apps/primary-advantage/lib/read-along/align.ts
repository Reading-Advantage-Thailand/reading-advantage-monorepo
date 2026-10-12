/**
 * Word alignment of the read-along (track primary_parity_read_along_20261011, Phase S1).
 * Pure functions: they map the words of the audio timings to the words on the screen.
 */
import { z } from "zod";

/** The audio timing of one word (the shape of `WordTimestamp`). */
export const WordTimingSchema = z.object({
  word: z.string(),
  start: z.number(),
  end: z.number(),
});

/** One sentence entry of `articles.sentences`; `words` can be empty (the real shapes). */
export const SentenceTimepointSchema = z.object({
  sentence: z.string(),
  startTime: z.number(),
  endTime: z.number(),
  words: z.array(WordTimingSchema).default([]),
  translations: z.record(z.string(), z.string().optional()).optional(),
});

/** A sentence entry with its word timings. */
export type ReadAlongSentence = z.infer<typeof SentenceTimepointSchema>;

/** One word on the screen. */
export interface DisplayWord {
  /** Position among the words of the sentence. */
  index: number;
  /** Text between the end of the previous word and the start of this word (spaces, dashes, quotes). */
  lead: string;
  /** The word without edge punctuation. */
  text: string;
}

/** A sentence split into screen words; `lead` + `text` of each word + `tail` give the sentence back. */
export interface DisplaySentence {
  words: DisplayWord[];
  /** Text after the last word. */
  tail: string;
}

/** The two maps between the audio word indexes and the screen word indexes. */
export interface WordMaps {
  /** For each audio word, the screen word that it says (never -1 when the sentence has screen words). */
  audioToDisplay: number[];
  /** For each screen word, the audio word that says it (never -1 when the sentence has audio words). */
  displayToAudio: number[];
}

/**
 * Parses the `sentences` value of an article at the boundary.
 * @param raw The jsonb value.
 * @returns The sentence entries, or an empty list when the value has another shape.
 */
export function parseSentences(raw: unknown): ReadAlongSentence[] {
  throw new Error("not implemented");
}

/**
 * Splits text into display words: whitespace and dashes separate, edge punctuation goes to `lead`/`tail`.
 * @param text A sentence or a passage.
 * @returns The words in order and the tail; inner apostrophes and hyphens stay in the word.
 */
export function splitDisplayWords(text: string): DisplaySentence {
  throw new Error("not implemented");
}

/**
 * Lists the words of a text with no edge punctuation (the one tokenizer of the read-along).
 * @param text A sentence or a passage.
 * @returns The words in order.
 */
export function tokenizeWords(text: string): string[] {
  throw new Error("not implemented");
}

/**
 * Maps the audio words of a sentence to its screen words.
 * @param displayWords The screen words (`DisplayWord.text`).
 * @param audioWords The audio word texts (`SentenceTimepoint.words[].word`), with screen punctuation.
 * @returns The two maps; both stay in order.
 */
export function buildWordMaps(displayWords: string[], audioWords: string[]): WordMaps {
  throw new Error("not implemented");
}
