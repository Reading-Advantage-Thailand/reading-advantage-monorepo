/**
 * Dragon Rider content: the ride's words from a story, and the two gates of a round. A
 * `PracticeInput` keeps its vocabulary ids for the evidence; a plain APK `VocabularyInput` gets ids
 * `w-1`, `w-2`, ... from the index. The decoy is the meaning of another word of the ride.
 */
import type { PracticeInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { GateOption, RideWord } from './types.js';

export type DragonRiderInput = PracticeInput | VocabularyInput;

export function isVocabularyInput(input: DragonRiderInput): input is VocabularyInput {
  return Array.isArray(input);
}

export type WordSource = Pick<RideWord, 'id' | 'term' | 'translation' | 'position'>;

const norm = (text: string): string => text.trim().toLowerCase();

/**
 * The words of the input, in the input's order, each with its input position. Words with an empty
 * term or meaning are skipped (their positions stay unused).
 */
export function wordsOf(input: DragonRiderInput): WordSource[] {
  if (isVocabularyInput(input)) {
    return input
      .map((item, i) => ({ id: `w-${i + 1}`, term: item.term.trim(), translation: item.translation.trim(), position: i }))
      .filter((w) => w.term.length > 0 && w.translation.length > 0);
  }
  return input.vocabulary.map(({ id, term, translation }, position) => ({ id, term, translation, position }));
}

/** The words of a ride: up to `maxWords`, each once, in a seeded order, with counters at zero. */
export function rideWordsOf(input: DragonRiderInput, rng: Rng, maxWords: number): RideWord[] {
  return rng
    .shuffle(wordsOf(input))
    .slice(0, Math.max(0, maxWords))
    .map((w) => ({ ...w, attempts: 0, solved: false, returned: false }));
}

/**
 * The meanings other words can lend as decoys: distinct from the word's meaning and each other.
 * With `distinctTerms` (answer audio, where a gate plays its term), the terms are distinct too.
 */
export function decoysFor(word: WordSource, words: readonly WordSource[], distinctTerms = false): GateOption[] {
  const seen = new Set<string>([norm(word.translation)]);
  const terms = new Set<string>([norm(word.term)]);
  const decoys: GateOption[] = [];
  for (const other of words) {
    if (other.id === word.id) continue;
    const key = norm(other.translation);
    if (seen.has(key) || (distinctTerms && terms.has(norm(other.term)))) continue;
    seen.add(key);
    terms.add(norm(other.term));
    decoys.push({ id: other.id, text: other.translation, position: other.position });
  }
  return decoys;
}

/** The two gates for `word`: the right one at a seeded side. The rng rolls the decoy, then the side. */
export function gatesFor(
  word: WordSource,
  words: readonly WordSource[],
  gates: number,
  rng: Rng,
  distinctTerms = false,
): { options: GateOption[]; correctGate: number } {
  const decoys = rng.sample(decoysFor(word, words, distinctTerms), Math.max(0, gates - 1));
  const correctGate = rng.int(decoys.length + 1);
  const options = decoys.slice();
  options.splice(correctGate, 0, { id: word.id, text: word.translation, position: word.position });
  return { options, correctGate };
}
