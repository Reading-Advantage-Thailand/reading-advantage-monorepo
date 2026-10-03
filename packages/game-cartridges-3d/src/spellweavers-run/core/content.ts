/**
 * Spellweaver's Run content: the sentences of a run from a story, and the orbs of a round. A
 * `StoryInput` keeps its sentence ids and paragraphs for the evidence; a plain APK `SentenceInput`
 * gets ids `s-1`, `s-2`, ... and words from `term.split(/\s+/)`. A run takes sentences of 3 to 8
 * words (all sentences when none fits). Decoy orbs carry words of other places in the story.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { Orb, RunSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type SpellweaversInput = StoryInput | SentenceInput;

export function isSentenceInput(input: SpellweaversInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the run needs it before play. */
export interface SourceSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a run sentence can hold: 3 to 8 orbs in a row. */
export const SENTENCE_WORDS = { min: 3, max: 8 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: SpellweaversInput): SourceSentence[] {
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

/** The sentences a run can take: those of 3 to 8 words, or all of them when none fits. */
export function runSentencesOf(input: SpellweaversInput): SourceSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= SENTENCE_WORDS.min && s.words.length <= SENTENCE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The run's sentences: up to `maxSentences`, each once, in a seeded order, with zeroed counters. */
export function runOf(input: SpellweaversInput, rng: Rng, maxSentences: number): RunSentence[] {
  return rng
    .shuffle(runSentencesOf(input))
    .slice(0, Math.max(0, maxSentences))
    .map((s) => ({ ...s, misses: 0, started: false, cleared: false }));
}

/** A word compared without case and punctuation ("Brave." and "brave" are one word). */
export function normWord(word: string): string {
  const key = word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key.length > 0 ? key : word.toLowerCase();
}

/** Every distinct word of the story's sentences (first spelling wins), in the story's order. */
export function wordPoolOf(input: SpellweaversInput): string[] {
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
 * The orbs of a round for `answer`: `lanes` orbs (fewer when the pool has too few distinct
 * words), the right one at a seeded lane. The rng rolls the decoys first, then the lane.
 */
export function orbsFor(answer: string, pool: readonly string[], lanes: number, rng: Rng): { options: Orb[]; correctLane: number } {
  const key = normWord(answer);
  const decoys = rng.sample(
    pool.filter((w) => normWord(w) !== key),
    Math.max(0, lanes - 1),
  );
  const correctLane = rng.int(decoys.length + 1);
  const options: Orb[] = decoys.map((text) => ({ text }));
  options.splice(correctLane, 0, { text: answer });
  return { options, correctLane };
}
