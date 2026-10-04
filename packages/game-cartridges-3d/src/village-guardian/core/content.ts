/**
 * Village Guardian content: the watch's villages from a story. A `PracticeInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ...
 * and words from `term.split(' ')`. A village takes a sentence of 3 to 7 words; the watch is up to
 * 5 villages in a seeded order (fewer when the story has fewer such sentences).
 */
import type { SentenceInput, PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { VILLAGER_KINDS, type VillageSentence, type VillagerKind } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type VillageGuardianInput = PracticeInput | SentenceInput;

export function isSentenceInput(input: VillageGuardianInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the watch needs it: id, text, words, and the reading look-back paragraph. */
export interface WatchSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a village can hold: 3 to 7 villagers. */
export const VILLAGE_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: VillageGuardianInput): WatchSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: WatchSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: WatchSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/**
 * The sentences a village can take: those of 3 to 7 words. When the input has none of that
 * length, every sentence qualifies (a short APK list still plays).
 */
export function villageSentencesOf(input: VillageGuardianInput): WatchSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= VILLAGE_WORDS.min && s.words.length <= VILLAGE_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The villager kinds of a village: the seeded list, cycled when the sentence has more words than kinds. */
export function villagerKindsOf(rng: Rng, count: number): VillagerKind[] {
  const kinds: VillagerKind[] = [];
  while (kinds.length < count) kinds.push(...rng.shuffle(VILLAGER_KINDS));
  return kinds.slice(0, count);
}

/** The villages of a watch: up to `maxVillages` sentences, each once, in a seeded order. */
export function watchOf(input: VillageGuardianInput, rng: Rng, maxVillages: number): VillageSentence[] {
  return rng
    .shuffle(villageSentencesOf(input))
    .slice(0, Math.max(0, maxVillages))
    .map((s, i) => ({ ...s, villageId: `village-${i + 1}`, refusals: 0, started: false, cleared: false }));
}
