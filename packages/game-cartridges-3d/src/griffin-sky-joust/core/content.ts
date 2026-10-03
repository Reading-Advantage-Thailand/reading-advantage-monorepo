/**
 * Griffin Sky-Joust content: the sentences of a game from a story. A `StoryInput` keeps its
 * sentence ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`,
 * `s-2`, ... and words from `term.split(/\s+/)`. A game takes sentences of 3 to 8 words (all
 * sentences when none fits).
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { JoustSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type JoustInput = StoryInput | SentenceInput;

export function isSentenceInput(input: JoustInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the game needs it before play. */
export interface SourceSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a game sentence can hold: 3 to 8 riders in the air. */
export const SENTENCE_WORDS = { min: 3, max: 8 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: JoustInput): SourceSentence[] {
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

/** The sentences a game can take: those of 3 to 8 words, or all of them when none fits. */
export function joustSentencesOf(input: JoustInput): SourceSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= SENTENCE_WORDS.min && s.words.length <= SENTENCE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The game's sentences: up to `max`, each once, in a seeded order, with zeroed counters. */
export function joustOf(input: JoustInput, rng: Rng, max: number): JoustSentence[] {
  return rng
    .shuffle(joustSentencesOf(input))
    .slice(0, Math.max(0, max))
    .map((s) => ({ ...s, misses: 0, started: false, cleared: false }));
}

/** A word compared without case and punctuation ("Brave." and "brave" are one word). */
export function normWord(word: string): string {
  const key = word.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');
  return key.length > 0 ? key : word.toLowerCase();
}
