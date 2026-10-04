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

export type WordSource = Pick<RideWord, 'id' | 'term' | 'translation'>;

const norm = (text: string): string => text.trim().toLowerCase();

/** The words of the input, in the input's order. Words with an empty term or meaning are skipped. */
export function wordsOf(input: DragonRiderInput): WordSource[] {
  if (isVocabularyInput(input)) {
    return input
      .map((item, i) => ({ id: `w-${i + 1}`, term: item.term.trim(), translation: item.translation.trim() }))
      .filter((w) => w.term.length > 0 && w.translation.length > 0);
  }
  return input.vocabulary.map(({ id, term, translation }) => ({ id, term, translation }));
}

/** The words of a ride: up to `maxWords`, each once, in a seeded order, with counters at zero. */
export function rideWordsOf(input: DragonRiderInput, rng: Rng, maxWords: number): RideWord[] {
  return rng
    .shuffle(wordsOf(input))
    .slice(0, Math.max(0, maxWords))
    .map((w) => ({ ...w, attempts: 0, solved: false, returned: false }));
}

/** The meanings other words can lend as decoys: distinct from the word's meaning and each other. */
export function decoysFor(word: WordSource, words: readonly WordSource[]): GateOption[] {
  const seen = new Set<string>([norm(word.translation)]);
  const decoys: GateOption[] = [];
  for (const other of words) {
    if (other.id === word.id) continue;
    const key = norm(other.translation);
    if (seen.has(key)) continue;
    seen.add(key);
    decoys.push({ id: other.id, text: other.translation });
  }
  return decoys;
}

/** The two gates for `word`: the right one at a seeded side. The rng rolls the decoy, then the side. */
export function gatesFor(
  word: WordSource,
  words: readonly WordSource[],
  gates: number,
  rng: Rng,
): { options: GateOption[]; correctGate: number } {
  const decoys = rng.sample(decoysFor(word, words), Math.max(0, gates - 1));
  const correctGate = rng.int(decoys.length + 1);
  const options = decoys.slice();
  options.splice(correctGate, 0, { id: word.id, text: word.translation });
  return { options, correctGate };
}
