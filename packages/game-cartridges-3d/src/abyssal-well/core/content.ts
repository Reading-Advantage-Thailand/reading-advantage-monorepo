/**
 * Abyssal Well content: the descents of a run from a story. A `PracticeInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ...
 * and words from `term.split(/\s+/)`. A descent takes a sentence of 3 to 8 words; a run is up to
 * 4 descents in a seeded order. Each descent adds one echo enemy: a word of another sentence
 * that is not in this one.
 */
import type { SentenceInput, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { Descent } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type AbyssalWellInput = PracticeInput | SentenceInput;

export function isSentenceInput(input: AbyssalWellInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the run needs it. */
export interface WellSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a descent can hold: 3 to 8 enemies of words. */
export const DESCENT_WORDS = { min: 3, max: 8 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: AbyssalWellInput): WellSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: WellSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: WellSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences a descent can take: those of 3 to 8 words, or all of them when none fits. */
export function descentSentencesOf(input: AbyssalWellInput): WellSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= DESCENT_WORDS.min && s.words.length <= DESCENT_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** A word compared without case and edge punctuation ("Pip," equals "pip"). */
export function normalWord(word: string): string {
  return word.toLowerCase().replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, '');
}

/** The descents of a run: up to `maxDescents` sentences, each once, in a seeded order. */
export function descentsOf(input: AbyssalWellInput, rng: Rng, maxDescents: number): Descent[] {
  return rng
    .shuffle(descentSentencesOf(input))
    .slice(0, Math.max(0, maxDescents))
    .map((s, i) => ({ ...s, descentId: `descent-${i + 1}`, refusals: 0, started: false, cleared: false }));
}

/**
 * The echo word of a descent: a seeded word of the other sentences of the input that is not in
 * the descent's sentence. Null when the input has no such word (a one-sentence APK list).
 */
export function echoWordOf(input: AbyssalWellInput, sentenceId: string, words: readonly string[], rng: Rng): string | null {
  const own = new Set(words.map(normalWord));
  const pool = new Map<string, string>();
  for (const s of sentencesOf(input)) {
    if (s.id === sentenceId) continue;
    for (const w of s.words) {
      const key = normalWord(w);
      if (key.length > 0 && !own.has(key) && !pool.has(key)) pool.set(key, w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''));
    }
  }
  const list = [...pool.values()];
  return list.length > 0 ? rng.pick(list) : null;
}
