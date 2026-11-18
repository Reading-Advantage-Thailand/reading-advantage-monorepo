/**
 * Word alignment of the read-along (track primary_parity_read_along_20261011, Phase S1).
 * Pure functions: they map the words of the audio timings to the words on the screen.
 *
 * The timing schema and the word maps live in two modules, and this module keeps both names.
 * The browser maps the words of the passage, so it imports the word-map module and never the
 * schema library.
 */
import { z } from "zod";

export {
  buildWordMaps,
  splitDisplayWords,
  tokenizeWords,
  type DisplaySentence,
  type DisplayWord,
  type WordMaps,
} from "./align-words";

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
  translations: z.record(z.string(), z.string().optional()).optional().catch(undefined),
});

/** A sentence entry with its word timings. */
export type ReadAlongSentence = z.infer<typeof SentenceTimepointSchema>;

/**
 * Parses the `sentences` value of an article at the boundary.
 * @param raw The jsonb value.
 * @returns The valid sentence entries, or an empty list when the value is not a list.
 */
export function parseSentences(raw: unknown): ReadAlongSentence[] {
  if (!Array.isArray(raw)) return [];
  // Drop only the bad entry; the rest of the timings stay usable.
  return raw.flatMap((entry) => {
    const parsed = SentenceTimepointSchema.safeParse(entry);
    return parsed.success ? [parsed.data] : [];
  });
}
