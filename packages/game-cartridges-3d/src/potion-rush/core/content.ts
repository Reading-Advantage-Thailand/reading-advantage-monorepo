/**
 * Potion Rush content (task 16): the shift's orders from a story, with customers from a seeded
 * list. A `StoryInput` keeps its sentence ids and paragraphs for the evidence; a plain APK
 * `SentenceInput` gets ids `s-1`, `s-2`, ... and words from `term.split(' ')`.
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { CUSTOMER_KINDS, type CustomerKind, type Order } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type PotionRushInput = StoryInput | SentenceInput;

export function isSentenceInput(input: PotionRushInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the shift needs it: id, text, words, and the reading look-back paragraph. */
export interface ShiftSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: PotionRushInput): ShiftSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: ShiftSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: ShiftSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The customer kinds of a shift: the seeded list, cycled when the shift has more orders than kinds. */
export function customerKindsOf(rng: Rng, count: number): CustomerKind[] {
  const kinds: CustomerKind[] = [];
  while (kinds.length < count) kinds.push(...rng.shuffle(CUSTOMER_KINDS));
  return kinds.slice(0, count);
}

/**
 * The orders of a shift: up to `maxOrders` sentences, each once, in a seeded order, with one
 * customer per order. The rng rolls the sentence order first, then the customer kinds.
 */
export function ordersOf(input: PotionRushInput, rng: Rng, maxOrders: number): Order[] {
  const sentences = rng.shuffle(sentencesOf(input)).slice(0, Math.max(0, maxOrders));
  const kinds = customerKindsOf(rng, sentences.length);
  return sentences.map((s, i) => ({
    ...s,
    customerId: `c${i + 1}`,
    kind: kinds[i]!,
    wrong: 0,
    started: false,
    served: false,
  }));
}
