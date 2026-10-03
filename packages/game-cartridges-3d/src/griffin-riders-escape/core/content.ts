/**
 * Griffin Riders Escape content: the sentences of an escape from a story, and the waves of a
 * flight. A `StoryInput` keeps its sentence ids and paragraphs for the evidence; a plain APK
 * `SentenceInput` gets ids `s-1`, `s-2`, ... and words from `term.split(/\s+/)`. An escape takes
 * sentences of 3 to 8 words (all sentences when none fits). Decoy gates carry other words of the
 * story.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { EscapeSentence, Gate } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type EscapeInput = StoryInput | SentenceInput;

export function isSentenceInput(input: EscapeInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the escape needs it before play. */
export interface SourceSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words an escape sentence can hold. */
export const SENTENCE_WORDS = { min: 3, max: 8 } as const;

/** Lanes across the sky, and the distance between two lane centers, in meters. */
export const LANES = { count: 3, gap: 3.6 } as const;

/** The x of a lane center (the middle lane is 0). */
export const laneX = (lane: number): number => (lane - (LANES.count - 1) / 2) * LANES.gap;

/** The lane whose center is nearest to `x`. */
export function nearestLane(x: number): number {
  const lane = Math.round(x / LANES.gap + (LANES.count - 1) / 2);
  return Math.min(LANES.count - 1, Math.max(0, lane));
}

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: EscapeInput): SourceSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: SourceSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation.trim();
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: SourceSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences an escape can take: those of 3 to 8 words, or all of them when none fits. */
export function escapeSentencesOf(input: EscapeInput): SourceSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= SENTENCE_WORDS.min && s.words.length <= SENTENCE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The escape's sentences: up to `maxSentences`, each once, in a seeded order, with zeroed counters. */
export function escapeOf(input: EscapeInput, rng: Rng, maxSentences: number): EscapeSentence[] {
  return rng
    .shuffle(escapeSentencesOf(input))
    .slice(0, Math.max(0, maxSentences))
    .map((s) => ({ ...s, misses: 0, started: false, cleared: false }));
}

/** A word compared without case and punctuation ("Brave." and "brave" are one word). */
export function normWord(word: string): string {
  const key = word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key.length > 0 ? key : word.toLowerCase();
}

/** Every distinct word of the story's sentences (first spelling wins), in the story's order. */
export function wordPoolOf(input: EscapeInput): string[] {
  const seen = new Set<string>();
  const pool: string[] = [];
  for (const sentence of sentencesOf(input)) {
    for (const word of sentence.words) {
      const key = normWord(word);
      if (seen.has(key)) continue;
      seen.add(key);
      pool.push(word);
    }
  }
  return pool;
}

/**
 * The gates of a row for `answer`: one gate per lane (fewer when the pool has too few distinct
 * words), the right one in a seeded lane. The rng rolls the decoys, then the lane.
 */
export function gatesFor(answer: string, pool: readonly string[], rng: Rng): { gates: Gate[]; rightLane: number } {
  const key = normWord(answer);
  const decoys = rng.sample(
    pool.filter((w) => normWord(w) !== key),
    LANES.count - 1,
  );
  const rightLane = rng.int(decoys.length + 1);
  const words = decoys.slice();
  words.splice(rightLane, 0, answer);
  return { gates: words.map((text, lane) => ({ lane, text })), rightLane };
}

/** The lanes a storm fills: `count` of the lanes, chosen by the rng; one lane at least stays free. */
export function stormLanesFor(count: number, rng: Rng): number[] {
  const lanes = Array.from({ length: LANES.count }, (_, i) => i);
  return rng
    .sample(lanes, Math.min(count, LANES.count - 1))
    .slice()
    .sort((a, b) => a - b);
}
