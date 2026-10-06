/**
 * Storm Castle Tower content: the towers of the climb from a story. A `PracticeInput` keeps its
 * sentence ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`,
 * ... and words from `term.split(' ')`. A tower takes a sentence of 3 to 7 words; the climb is up
 * to 4 towers in a seeded order (fewer when the story has fewer such sentences). The windows of a
 * row hold the next word and words of the same sentence and of other sentences of the story.
 */
import type { SentenceInput, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { TowerSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type StormCastleTowerInput = PracticeInput | SentenceInput;

export function isSentenceInput(input: StormCastleTowerInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the climb needs it: id, text, words, and the reading look-back paragraph. */
export interface ClimbSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a tower can hold: 3 to 7. */
export const TOWER_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: StormCastleTowerInput): ClimbSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: ClimbSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: ClimbSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/**
 * The sentences a tower can take: those of 3 to 7 words. When the input has none of that
 * length, every sentence qualifies (a short APK list still plays).
 */
export function towerSentencesOf(input: StormCastleTowerInput): ClimbSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= TOWER_WORDS.min && s.words.length <= TOWER_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The towers of a climb: up to `maxTowers` sentences, each once, in a seeded order. */
export function shiftOf(input: StormCastleTowerInput, rng: Rng, maxTowers: number): TowerSentence[] {
  return rng
    .shuffle(towerSentencesOf(input))
    .slice(0, Math.max(0, maxTowers))
    .map((s, i) => ({ ...s, towerId: `tower-${i + 1}`, refusals: 0, started: false, cleared: false }));
}

/** A word as a window shows it: the letters without the punctuation around them (no hint of position). */
export function bareWord(word: string): string {
  const bare = word.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
  return bare.length > 0 ? bare : word;
}

/** Two windows hold the same word when their bare words match, ignoring case. */
export const wordKey = (word: string): string => bareWord(word).toLocaleLowerCase('en');

/**
 * The other words for the word `answer` of `sentence`: first the other words of the same
 * sentence (the student sorts out the order), then words of the other sentences of the story.
 * Each word differs from the answer and from the others; the order is seeded.
 */
export function distractorsOf(
  sentence: readonly string[],
  others: readonly string[],
  answer: string,
  rng: Rng,
  count: number,
): string[] {
  const taken = new Set<string>([wordKey(answer)]);
  const out: string[] = [];
  for (const pool of [sentence, others]) {
    for (const w of rng.shuffle(pool.slice())) {
      if (out.length >= count) return out;
      const key = wordKey(w);
      if (taken.has(key)) continue;
      taken.add(key);
      out.push(bareWord(w));
    }
  }
  return out;
}
