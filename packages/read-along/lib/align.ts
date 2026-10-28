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
  translations: z.record(z.string(), z.string().optional()).optional().catch(undefined),
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

/** Screen words may be at most this many positions away from an anchor on each side. */
const MAX_GAP = 9;

const EDGE_START = /[\p{L}\p{N}]/u;

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

/**
 * Splits text into display words: whitespace and dashes separate, edge punctuation goes to `lead`/`tail`.
 * @param text A sentence or a passage.
 * @returns The words in order and the tail; inner apostrophes and hyphens stay in the word.
 */
export function splitDisplayWords(text: string): DisplaySentence {
  const words: DisplayWord[] = [];
  let lead = "";
  for (const chunk of text.match(/[^\s—–]+|[\s—–]+/gu) ?? []) {
    const chars = Array.from(chunk);
    const first = chars.findIndex((c) => EDGE_START.test(c));
    if (first === -1) {
      lead += chunk;
      continue;
    }
    let last = chars.length - 1;
    while (!EDGE_START.test(chars[last])) last--;
    words.push({ index: words.length, lead: lead + chars.slice(0, first).join(""), text: chars.slice(first, last + 1).join("") });
    lead = chars.slice(last + 1).join("");
  }
  return { words, tail: lead };
}

/**
 * Lists the words of a text with no edge punctuation (the one tokenizer of the read-along).
 * @param text A sentence or a passage.
 * @returns The words in order.
 */
export function tokenizeWords(text: string): string[] {
  return splitDisplayWords(text).words.map((w) => w.text);
}

/** Lower-case text with no punctuation, for comparison. */
const squash = (word: string) => word.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

/** True when two strings differ by at most one inserted, deleted, or changed letter. */
function withinOneEdit(x: string, y: string): boolean {
  if (Math.abs(x.length - y.length) > 1) return false;
  let i = 0;
  while (i < x.length && i < y.length && x[i] === y[i]) i++;
  if (x.length === y.length) return x.slice(i + 1) === y.slice(i + 1);
  return x.length > y.length ? x.slice(i + 1) === y.slice(i) : y.slice(i + 1) === x.slice(i);
}

/** Loose match for one pair: prefix, suffix, or one letter of difference. */
function looseMatch(x: string, y: string): boolean {
  const [short, long] = x.length <= y.length ? [x, y] : [y, x];
  if (short.length >= 3 && (long.startsWith(short) || long.endsWith(short))) return true;
  return short.length >= 4 && withinOneEdit(x, y);
}

/**
 * Fills the -1 entries of a map with the nearest earlier value, or the nearest later value at the start.
 * @param map The map to fill in place.
 */
function fillGaps(map: number[]): void {
  let carry = -1;
  for (let i = 0; i < map.length; i++) {
    if (map[i] === -1) map[i] = carry;
    else carry = map[i];
  }
  let next = -1;
  for (let i = map.length - 1; i >= 0; i--) {
    if (map[i] === -1) map[i] = next;
    else next = map[i];
  }
}

/**
 * Maps the audio words of a sentence to its screen words.
 * @param displayWords The screen words (`DisplayWord.text`).
 * @param audioWords The audio word texts (`SentenceTimepoint.words[].word`), with screen punctuation.
 * @returns The two maps; both stay in order.
 */
export function buildWordMaps(displayWords: string[], audioWords: string[]): WordMaps {
  const D = displayWords.map(squash);
  const A = audioWords.map(squash);
  const audioToDisplay = A.map(() => -1);
  const displayToAudio = D.map(() => -1);

  /** Exact match, or a join of up to 3 tokens on one side. Returns [screen words used, audio words used]. */
  const strong = (d: number, a: number): [number, number] | null => {
    if (!A[a] || !D[d]) return null;
    if (D[d] === A[a]) return [1, 1];
    for (let k = 2; k <= 3; k++) if (a + k <= A.length && A.slice(a, a + k).join("") === D[d]) return [1, k];
    for (let k = 2; k <= 3; k++) if (d + k <= D.length && D.slice(d, d + k).join("") === A[a]) return [k, 1];
    return null;
  };

  let d = 0;
  let a = 0;
  while (d < D.length && a < A.length) {
    if (!A[a]) {
      a++;
      continue;
    }
    let step = strong(d, a);
    if (!step && looseMatch(D[d], A[a])) step = [1, 1];
    if (!step) {
      // Resync: the nearest pair of positions (by total skip) that match exactly.
      let skip: [number, number] | null = null;
      for (let total = 1; total <= 2 * MAX_GAP && !skip; total++) {
        for (let i = Math.max(0, total - MAX_GAP); i <= Math.min(total, MAX_GAP); i++) {
          if (d + i < D.length && a + total - i < A.length && strong(d + i, a + total - i)) {
            skip = [i, total - i];
            break;
          }
        }
      }
      if (skip) {
        // Equal skips are a substitution: pair the skipped words 1:1.
        if (skip[0] === skip[1]) {
          for (let x = 0; x < skip[0]; x++) {
            audioToDisplay[a + x] = d + x;
            displayToAudio[d + x] = a + x;
          }
        }
        d += skip[0];
        a += skip[1];
        continue;
      }
      step = [1, 1];
    }
    for (let x = 0; x < step[1]; x++) audioToDisplay[a + x] = d;
    for (let y = 0; y < step[0]; y++) displayToAudio[d + y] = a;
    d += step[0];
    a += step[1];
  }
  fillGaps(audioToDisplay);
  fillGaps(displayToAudio);
  return { audioToDisplay, displayToAudio };
}
