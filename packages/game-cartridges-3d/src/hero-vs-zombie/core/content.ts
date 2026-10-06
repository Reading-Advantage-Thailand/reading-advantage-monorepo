/**
 * Hero vs. Zombie content: the night's words from a story, and the orbs of a round. A
 * `PracticeInput` keeps its vocabulary ids for the evidence; a plain APK `VocabularyInput` gets ids
 * `w-1`, `w-2`, ... from the index. Decoys are the meanings of other words of the night.
 */
import type { PracticeInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import type { NightWord } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK vocabulary array. */
export type HeroVsZombieInput = PracticeInput | VocabularyInput;

export function isVocabularyInput(input: HeroVsZombieInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** A word as the night needs it before play: id, term, meaning. */
export type WordSource = Pick<NightWord, 'id' | 'term' | 'translation'>;

/** The meaning an orb carries and the word it belongs to. */
export interface OrbOption {
  wordId: string;
  text: string;
  correct: boolean;
}

const norm = (text: string): string => text.trim().toLowerCase();

/** The words of the input, in the input's order. Words with an empty term or meaning are skipped. */
export function wordsOf(input: HeroVsZombieInput): WordSource[] {
  if (isVocabularyInput(input)) {
    return input
      .map((item, i) => ({ id: `w-${i + 1}`, term: item.term.trim(), translation: item.translation.trim() }))
      .filter((w) => w.term.length > 0 && w.translation.length > 0);
  }
  return input.vocabulary.map(({ id, term, translation }) => ({ id, term, translation }));
}

/**
 * The words of a night: up to `maxWords` words, each once, in a seeded order, with their
 * counters at zero. The first pass of the queue is this order.
 */
export function nightWordsOf(input: HeroVsZombieInput, rng: Rng, maxWords: number): NightWord[] {
  return rng
    .shuffle(wordsOf(input))
    .slice(0, Math.max(0, maxWords))
    .map((w) => ({ ...w, attempts: 0, solved: false, returned: false }));
}

/**
 * The meanings other words can lend as decoys for `word`: distinct from the word's meaning and
 * from each other (case-insensitive), in the night's order. Each decoy keeps its owner's id.
 */
export function decoysFor(word: WordSource, words: readonly WordSource[]): OrbOption[] {
  const seen = new Set<string>([norm(word.translation)]);
  const decoys: OrbOption[] = [];
  for (const other of words) {
    if (other.id === word.id) continue;
    const key = norm(other.translation);
    if (seen.has(key)) continue;
    seen.add(key);
    decoys.push({ wordId: other.id, text: other.translation, correct: false });
  }
  return decoys;
}

/**
 * The orbs of a round for `word`: `count` options (fewer when the night has too few distinct
 * meanings), the right one at a seeded position. The rng rolls the decoys first, then the position.
 */
export function orbsFor(word: WordSource, words: readonly WordSource[], count: number, rng: Rng): OrbOption[] {
  const decoys = rng.sample(decoysFor(word, words), Math.max(0, count - 1));
  const at = rng.int(decoys.length + 1);
  const options = decoys.slice();
  options.splice(at, 0, { wordId: word.id, text: word.translation, correct: true });
  return options;
}
