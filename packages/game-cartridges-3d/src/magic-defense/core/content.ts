/**
 * Magic Defense content: the words of a run from a story, the waves that hold them, the
 * monster formation of a wave, and the missile of a round (its meaning, its castle, and the spell
 * words to choose from). A `StoryInput` keeps its vocabulary ids for the evidence; a plain APK
 * `VocabularyInput` gets ids `w-1`, `w-2`, ...
 */
import type { StoryInput, VocabularyInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Rng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { MONSTER_KINDS, type MonsterKind, type Round, type TargetWord, type WaveEnemy } from './types.js';

export type MagicDefenseInput = StoryInput | VocabularyInput;

export function isVocabularyInput(input: MagicDefenseInput): input is VocabularyInput {
  return Array.isArray(input);
}

/** The words of the input with ids; words with an empty term or translation are skipped. */
export function wordsOf(input: MagicDefenseInput): { id: string; term: string; translation: string }[] {
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
export function targetsOf(input: MagicDefenseInput, rng: Rng, wordsPerWave: number): TargetWord[] {
  const words = rng.shuffle(wordsOf(input));
  const sizes = waveSizes(words.length, wordsPerWave);
  const wave: number[] = sizes.flatMap((size, i) => Array.from({ length: size }, () => i + 1));
  return words.map((w, i) => ({ ...w, wave: wave[i]!, attempts: 0, correctFirstTry: false, solved: false }));
}

/** The number of distinct English terms in the run: the most lanes a round can fill. */
export function distinctTerms(targets: readonly Pick<TargetWord, 'term'>[]): number {
  return new Set(targets.map((t) => t.term.toLowerCase())).size;
}

/** The enemies of a wave, one in front of each castle: the monster kinds alternate from castle to castle, and from wave to wave. */
export function formationOf(wave: number, lanes: number): WaveEnemy[] {
  return Array.from({ length: lanes }, (_, lane) => {
    const kind: MonsterKind = MONSTER_KINDS[(lane + wave) % MONSTER_KINDS.length]!;
    return { id: `w${wave}-l${lane}-${kind}`, lane, kind };
  });
}

/** The castles with at least one heart, in order (all castles when none is left). */
export function standingCastles(castles: readonly number[]): number[] {
  const up = castles.flatMap((h, i) => (h > 0 ? [i] : []));
  return up.length > 0 ? up : castles.map((_, i) => i);
}

/**
 * The round of a word: the missile falls on a seeded standing castle (cast by the enemy of that
 * lane); the choices are the right term and the terms of other words (distinct terms), in a
 * seeded order. Every choice starts open.
 */
export function roundOf(targets: readonly TargetWord[], wordId: string, enemies: readonly WaveEnemy[], castles: readonly number[], count: number, rng: Rng): Round {
  const word = targets.find((t) => t.id === wordId)!;
  const seen = new Set([word.term.toLowerCase()]);
  const others = rng.shuffle(targets.filter((t) => t.id !== wordId)).filter((t) => {
    const key = t.term.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  const carried = rng.shuffle([word, ...others.slice(0, Math.max(0, count - 1))]);
  const castle = rng.pick(standingCastles(castles));
  const enemy = enemies.find((e) => e.lane === castle) ?? enemies[0]!;
  return {
    wordId,
    prompt: word.translation,
    castle: enemy.lane,
    enemyId: enemy.id,
    choices: carried.map((w, index) => ({ index, wordId: w.id, term: w.term, blocked: false })),
  };
}
