/**
 * Alchemist's Synthesis content: the formulas of a synthesis from a story's vocabulary, and the
 * jars of a formula. A `StoryInput` keeps its vocabulary ids for the evidence; a plain APK
 * `VocabularyInput` gets ids `w-1`, `w-2`, ... from the index. The decoy jars carry the terms of
 * other words of the synthesis (the legacy rule: the options are terms, the prompt is the meaning).
 */
import type { StoryInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { INGREDIENT_KINDS, type Formula, type IngredientKind } from './types.js';

/** The input the core accepts: the whole story (the host passes it) or the APK vocabulary array. */
export type AlchemistsSynthesisInput = StoryInput | VocabularyInput;

export function isVocabularyInput(input: AlchemistsSynthesisInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** A word as the synthesis needs it before play: id, term, meaning. */
export type WordSource = Pick<Formula, 'id' | 'term' | 'translation'>;

/** A jar before it gets an id: its term, its formula, and whether it is the right one. */
export interface JarOption {
  wordId: string;
  term: string;
  correct: boolean;
  kind: IngredientKind;
}

const norm = (text: string): string => text.trim().toLowerCase();

/** The words of the input, in the input's order. Words with an empty term or meaning are skipped. */
export function wordsOf(input: AlchemistsSynthesisInput): WordSource[] {
  if (isVocabularyInput(input)) {
    return input
      .map((item, i) => ({ id: `w-${i + 1}`, term: item.term.trim(), translation: item.translation.trim() }))
      .filter((w) => w.term.length > 0 && w.translation.length > 0);
  }
  return input.vocabulary.map(({ id, term, translation }) => ({ id, term, translation }));
}

/** The formulas of a synthesis: up to `maxWords` words, each once, in a seeded order, counters at zero. */
export function formulasOf(input: AlchemistsSynthesisInput, rng: Rng, maxWords: number): Formula[] {
  return rng
    .shuffle(wordsOf(input))
    .slice(0, Math.max(0, maxWords))
    .map((w) => ({ ...w, attempts: 0, started: false, solved: false }));
}

/**
 * The terms other words can lend as decoys for `word`: distinct from the word's term and from
 * each other (case-insensitive), in the synthesis order. Each decoy keeps its owner's id.
 */
export function decoysFor(word: WordSource, words: readonly WordSource[]): WordSource[] {
  const seen = new Set<string>([norm(word.term)]);
  const decoys: WordSource[] = [];
  for (const other of words) {
    if (other.id === word.id) continue;
    const key = norm(other.term);
    if (seen.has(key)) continue;
    seen.add(key);
    decoys.push(other);
  }
  return decoys;
}

/**
 * The jars of a formula: `count` options (fewer when the synthesis has too few distinct terms), the
 * right one at a seeded place, each with a seeded ingredient kind. The rng rolls the decoys first,
 * then the place, then the kinds.
 */
export function jarsFor(word: WordSource, words: readonly WordSource[], count: number, rng: Rng): JarOption[] {
  const decoys = rng.sample(decoysFor(word, words), Math.max(0, count - 1));
  const at = rng.int(decoys.length + 1);
  const terms = decoys.map((d) => ({ wordId: d.id, term: d.term, correct: false }));
  terms.splice(at, 0, { wordId: word.id, term: word.term, correct: true });
  const kinds = rng.shuffle(INGREDIENT_KINDS);
  return terms.map((jar, i) => ({ ...jar, kind: kinds[i % kinds.length]! }));
}
