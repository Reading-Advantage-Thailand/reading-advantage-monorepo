/**
 * Realm Carver content: the realms of a campaign from a story. A `StoryInput` keeps its sentence
 * ids and paragraphs for the evidence; a plain APK `SentenceInput` gets ids `s-1`, `s-2`, ... and
 * words from `term.split(' ')`. A realm takes a sentence of 3 to 7 words; the campaign is up to 4
 * realms in a seeded order (fewer when the story has fewer such sentences).
 */
import type { SentenceInput, StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { MONSTER_KINDS, type MonsterKind, type RealmSentence } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK sentence array. */
export type RealmCarverInput = StoryInput | SentenceInput;

export function isSentenceInput(input: RealmCarverInput): input is SentenceInput {
  return Array.isArray(input);
}

/** A sentence as the campaign needs it. */
export interface CampaignSentence {
  id: string;
  text: string;
  words: string[];
  translation?: string;
  paragraph?: number;
}

/** The words a realm can hold. */
export const REALM_WORDS = { min: 3, max: 7 } as const;

/** The sentences of the input, in the input's order. Sentences with fewer than 2 words are skipped. */
export function sentencesOf(input: RealmCarverInput): CampaignSentence[] {
  if (isSentenceInput(input)) {
    return input
      .map((item, i) => {
        const text = item.term.trim();
        const words = text.split(/\s+/).filter((w) => w.length > 0);
        const sentence: CampaignSentence = { id: `s-${i + 1}`, text, words };
        if (item.translation.trim().length > 0) sentence.translation = item.translation;
        return sentence;
      })
      .filter((s) => s.words.length >= 2);
  }
  return input.sentences.map((s) => {
    const sentence: CampaignSentence = { id: s.id, text: s.text, words: s.words.slice() };
    if (s.translation !== undefined) sentence.translation = s.translation;
    if (s.paragraph !== undefined) sentence.paragraph = s.paragraph;
    return sentence;
  });
}

/** The sentences a realm can take: those of 3 to 7 words (every sentence when none fits). */
export function realmSentencesOf(input: RealmCarverInput): CampaignSentence[] {
  const all = sentencesOf(input);
  const fit = all.filter((s) => s.words.length >= REALM_WORDS.min && s.words.length <= REALM_WORDS.max);
  return fit.length > 0 ? fit : all;
}

/** The monster kinds of a realm: the seeded list, cycled when the realm has more monsters than kinds. */
export function monsterKindsOf(rng: Rng, count: number): MonsterKind[] {
  const kinds: MonsterKind[] = [];
  while (kinds.length < count) kinds.push(...rng.shuffle(MONSTER_KINDS));
  return kinds.slice(0, count);
}

/** The realms of a campaign: up to `maxRealms` sentences, each once, in a seeded order. */
export function campaignOf(input: RealmCarverInput, rng: Rng, maxRealms: number): RealmSentence[] {
  return rng
    .shuffle(realmSentencesOf(input))
    .slice(0, Math.max(0, maxRealms))
    .map((s, i) => ({ ...s, realmId: `realm-${i + 1}`, misses: 0, started: false, cleared: false }));
}
