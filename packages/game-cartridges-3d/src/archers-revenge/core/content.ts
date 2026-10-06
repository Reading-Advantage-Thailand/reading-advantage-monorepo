/**
 * Archer's Revenge content: the words of a run from a story, the waves that hold them, the
 * monster formation of a wave, and the lanes of a round (the right English word among shielded
 * distractors). A `PracticeInput` keeps its vocabulary ids for the evidence; a plain APK
 * `VocabularyInput` gets ids `w-1`, `w-2`, ...
 */
import type { PracticeInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { MONSTER_KINDS, type Lane, type MonsterKind, type Round, type TargetWord, type WaveEnemy } from './types.js';

export type ArchersRevengeInput = PracticeInput | VocabularyInput;

export function isVocabularyInput(input: ArchersRevengeInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** The words of the input with ids; words with an empty term or translation are skipped. */
export function wordsOf(input: ArchersRevengeInput): { id: string; term: string; translation: string }[] {
  const items = isVocabularyInput(input)
    ? input.map((w, i) => ({ id: `w-${i + 1}`, term: w.term.trim(), translation: w.translation.trim() }))
    : input.vocabulary.map((w) => ({ id: w.id, term: w.term.trim(), translation: w.translation.trim() }));
  return items.filter((w) => w.term.length > 0 && w.translation.length > 0);
}

/** The words per wave, spread evenly: 11 words in `wordsPerWave` 5 make waves of 4, 4, and 3. */
export function waveSizes(count: number, wordsPerWave: number): number[] {
  if (count <= 0) return [];
  const waves = Math.ceil(count / wordsPerWave);
  const base = Math.floor(count / waves);
  const extra = count % waves;
  return Array.from({ length: waves }, (_, i) => base + (i < extra ? 1 : 0));
}

/** The target words of a run: every word once, in a seeded order, each with the wave that holds it. */
export function targetsOf(input: ArchersRevengeInput, rng: Rng, wordsPerWave: number): TargetWord[] {
  const words = rng.shuffle(wordsOf(input));
  const sizes = waveSizes(words.length, wordsPerWave);
  const wave: number[] = sizes.flatMap((size, i) => Array.from({ length: size }, () => i + 1));
  return words.map((w, i) => ({ ...w, wave: wave[i]!, attempts: 0, correctFirstTry: false, solved: false }));
}

/** The number of distinct English terms in the run: the most lanes a round can fill. */
export function distinctTerms(targets: readonly Pick<TargetWord, 'term'>[]): number {
  return new Set(targets.map((t) => t.term.toLowerCase())).size;
}

/** The enemies of a wave: the monster kinds alternate from lane to lane, and from wave to wave. */
export function formationOf(wave: number, lanes: number): WaveEnemy[] {
  return Array.from({ length: lanes }, (_, lane) => {
    const kind: MonsterKind = MONSTER_KINDS[(lane + wave) % MONSTER_KINDS.length]!;
    return { id: `w${wave}-l${lane}-${kind}`, lane, kind };
  });
}

/**
 * The round of a word: the lane of the right enemy is seeded, the other lanes carry the terms of
 * other words (distinct terms), in a seeded order. Every lane starts with an unbroken shield.
 */
export function roundOf(targets: readonly TargetWord[], wordId: string, enemies: readonly WaveEnemy[], rng: Rng): Round {
  const word = targets.find((t) => t.id === wordId)!;
  const seen = new Set([word.term.toLowerCase()]);
  const others = rng.shuffle(targets.filter((t) => t.id !== wordId)).filter((t) => {
    const key = t.term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const carried = rng.shuffle([word, ...others.slice(0, Math.max(0, enemies.length - 1))]);
  const lanes: Lane[] = enemies.map((e, i) => ({
    lane: e.lane,
    enemyId: e.id,
    kind: e.kind,
    wordId: carried[i]!.id,
    term: carried[i]!.term,
    blocked: false,
  }));
  return { wordId, prompt: word.translation, lanes };
}
