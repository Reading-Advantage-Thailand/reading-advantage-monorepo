/**
 * Enchanted Library content: the rounds of a visit from the vocabulary of a story. A `PracticeInput`
 * keeps its vocabulary ids; a plain APK `VocabularyInput` gets ids `v-1`, `v-2`, ... A round
 * holds one word. The visit is up to 8 rounds in a seeded order (fewer when the story has fewer
 * words). Each round shows the right book and up to 3 decoy books of other words.
 */
import type { PracticeInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { LibraryRound } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK vocabulary array. */
export type LibraryInput = PracticeInput | VocabularyInput;

export function isVocabularyInput(input: LibraryInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** A word as the visit needs it. */
export interface LibraryWord {
  id: string;
  term: string;
  translation: string;
}

/** The decoy books of one round. */
export const DECOYS = 3;

/** A term compared without case and edge spaces. */
export const normalTerm = (term: string): string => term.trim().toLowerCase();

/** The words of the input in the input's order. Words with an empty term or prompt are skipped; a repeated term counts once. */
export function wordsOf(input: LibraryInput): LibraryWord[] {
  const raw: LibraryWord[] = isVocabularyInput(input)
    ? input.map((item, i) => ({ id: `v-${i + 1}`, term: item.term.trim(), translation: item.translation.trim() }))
    : input.vocabulary.map((v) => ({ id: v.id, term: v.term.trim(), translation: v.translation.trim() }));
  const seen = new Set<string>();
  return raw.filter((w) => {
    const key = normalTerm(w.term);
    if (key.length === 0 || w.translation.length === 0 || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** The rounds of a visit: up to `maxRounds` words, each once, in a seeded order. */
export function visitOf(input: LibraryInput, rng: Rng, maxRounds: number): LibraryRound[] {
  return rng
    .shuffle(wordsOf(input))
    .slice(0, Math.max(0, maxRounds))
    .map((w, i) => ({ id: w.id, roundId: `round-${i + 1}`, term: w.term, translation: w.translation, wrong: 0, started: false, cleared: false }));
}

/** The decoy terms of a round: up to `DECOYS` other words of the input, in a seeded order. */
export function decoysOf(input: LibraryInput, wordId: string, rng: Rng): string[] {
  const others = wordsOf(input).filter((w) => w.id !== wordId);
  return rng.shuffle(others).slice(0, DECOYS).map((w) => w.term);
}
