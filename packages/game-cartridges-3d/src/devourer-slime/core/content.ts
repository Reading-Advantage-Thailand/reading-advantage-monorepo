/**
 * Devourer Slime content: the shift's sentences from a story. A `PracticeInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ...
 * and words from `term.split(' ')`. A round takes a sentence of 3 to 7 words; the shift is up
 * to 5 sentences in a seeded order (fewer when the story has fewer such sentences).
 */
import type { SentenceInput, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { GUARD_KINDS, type GuardKind, type ShiftSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type DevourerSlimeInput = PracticeInput | SentenceInput;

export function isSentenceInput(input: DevourerSlimeInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence before play: id, text, words, and the reading look-back paragraph. */
export type SentenceSource = Pick<ShiftSentence, 'id' | 'text' | 'words' | 'translation' | 'paragraph'>;

/** The words a round can hold: 3 to 7 bubbles. */
export const ROUND_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: DevourerSlimeInput): SentenceSource[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: SentenceSource = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: SentenceSource = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/**
 * The sentences a round can take: those of 3 to 7 words. When the input has none of that
 * length, every sentence qualifies (a short APK list still plays).
 */
export function roundSentencesOf(input: DevourerSlimeInput): SentenceSource[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= ROUND_WORDS.min && s.words.length <= ROUND_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The guard kinds of a shift: the seeded list, cycled when there are more guards than kinds. */
export function guardKindsOf(rng: Rng, count: number): GuardKind[] {
  const kinds: GuardKind[] = [];
  while (kinds.length < count) kinds.push(...rng.shuffle(GUARD_KINDS));
  return kinds.slice(0, count);
}

/** The sentences of a shift: up to `maxSentences`, each once, in a seeded order. */
export function shiftOf(input: DevourerSlimeInput, rng: Rng, maxSentences: number): ShiftSentence[] {
  return rng
    .shuffle(roundSentencesOf(input))
    .slice(0, Math.max(0, maxSentences))
    .map((s) => ({ ...s, wrong: 0, started: false, complete: false }));
}
