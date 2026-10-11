/**
 * Dragon Flight content: the flight's words from a story, and the gates of a round. A
 * `PracticeInput` keeps its vocabulary ids for the evidence; a plain APK `VocabularyInput` gets ids
 * `w-1`, `w-2`, ... from the index. Decoys are the meanings of other words of the flight.
 */
import type { PracticeInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { FlightWord, GateOption } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK vocabulary array. */
export type DragonFlightInput = PracticeInput | VocabularyInput;

export function isVocabularyInput(input: DragonFlightInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** A word as the flight needs it before play: id, term, meaning, input position. */
export type WordSource = Pick<FlightWord, 'id' | 'term' | 'translation' | 'position'>;

const norm = (text: string): string => text.trim().toLowerCase();

/**
 * The words of the input, in the input's order, each with its input position. Words with an empty
 * term or meaning are skipped (their positions stay unused).
 */
export function wordsOf(input: DragonFlightInput): WordSource[] {
  if (isVocabularyInput(input)) {
    return input
      .map((item, i) => ({ id: `w-${i + 1}`, term: item.term.trim(), translation: item.translation.trim(), position: i }))
      .filter((w) => w.term.length > 0 && w.translation.length > 0);
  }
  return input.vocabulary.map(({ id, term, translation }, position) => ({ id, term, translation, position }));
}

/**
 * The words of a flight: up to `maxWords` words, each once, in a seeded order, with their
 * counters at zero. The first pass of the queue is this order.
 */
export function flightWordsOf(input: DragonFlightInput, rng: Rng, maxWords: number): FlightWord[] {
  return rng
    .shuffle(wordsOf(input))
    .slice(0, Math.max(0, maxWords))
    .map((w) => ({ ...w, attempts: 0, solved: false, returned: false }));
}

/**
 * The meanings other words can lend as decoys for `word`: distinct from the word's meaning and
 * from each other (case-insensitive), in the flight's order. Each decoy keeps its owner's id. With
 * `distinctTerms` (answer audio, where a gate plays its term), the terms are distinct too.
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

/**
 * The gates of a round for `word`: `gates` options (fewer when the flight has too few distinct
 * meanings), the right one at a seeded position. The rng rolls the decoys first, then the position.
 */
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
